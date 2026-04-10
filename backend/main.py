from flask import Flask, request, jsonify
from flask_cors import CORS
import pulp
import random

app = Flask(__name__)
CORS(app)

USERS = {"admin": "password123"}

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if USERS.get(username) == password:
        return jsonify({"success": True, "token": "dummy-token-123"})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route("/api/optimize", methods=["POST"])
def optimize():
    data = request.json
    N = int(data.get("planes", 3))
    FUEL_PRICE = float(data.get("gear_price", 1.0))
    airport = data.get("airport", "Tunis")

    random.seed(42)

    M = 8
    SLOT_START = 8

    planes  = list(range(1, N + 1))
    flights = list(range(1, M + 1))

    def slot_to_time(s):
        hour = SLOT_START + s - 1
        if hour >= 24:
            return f"+1j {hour - 24:02d}:00"
        return f"{hour:02d}:00"

    duration = {1:3, 2:2, 3:2, 4:1, 5:2, 6:2, 7:1, 8:3}
    dept_slot = {1:1, 2:1, 3:6, 4:8, 5:8, 6:11, 7:11, 8:13}

    def blocked_slots(j):
        start = dept_slot[j]
        total = 2 * duration[j] + 1
        return set(range(start, start + total))

    # Check feasibility
    all_slots = range(1, 25)
    peak = max(sum(1 for j in flights if s in blocked_slots(j)) for s in all_slots)
    if peak > N:
        return jsonify({"error": f"Infeasible: {peak} simultaneous flights > {N} planes"}), 400

    FuelBurn   = {i: round(random.uniform(3.5, 5.0), 2) for i in planes}
    RepairCost = {i: round(random.uniform(500, 1500), 2) for i in planes}
    FerryFuel  = {i: round(random.uniform(200, 600), 2) for i in planes}
    beta_r     = {i: round(random.uniform(50, 150), 2) for i in planes}
    Distance   = {j: round(duration[j] * random.uniform(700, 900), 2) for j in flights}
    alpha_d    = {j: round(random.uniform(10, 50), 2) for j in flights}
    night_cost = {j: round(random.uniform(100, 400), 2) for j in flights}
    is_night   = {j: (dept_slot[j] >= 10) for j in flights}
    REPAIR_TIME = round(random.uniform(0, 4), 2)
    CREW_COST   = round(random.uniform(800, 1500), 2)
    Delay      = {(i, j): round(random.uniform(0, 45), 2) for i in planes for j in flights}
    SlotCost   = {j: round(random.uniform(50, 300), 2) for j in flights}

    def compute_cost(i, j):
        C_f = FuelBurn[i] * Distance[j] * FUEL_PRICE * 2
        C_d = alpha_d[j] * Delay[(i, j)]
        C_n = night_cost[j] if is_night[j] else 0.0
        C_m = RepairCost[i] + beta_r[i] * REPAIR_TIME
        C_r = FerryFuel[i] + CREW_COST + SlotCost[j]
        return C_f + C_d + C_n + C_m + C_r

    C = {(i, j): compute_cost(i, j) for i in planes for j in flights}

    prob = pulp.LpProblem("Nouvelair_Scheduling", pulp.LpMinimize)
    x = pulp.LpVariable.dicts("x", [(i, j) for i in planes for j in flights], cat="Binary")

    prob += pulp.lpSum(C[(i, j)] * x[(i, j)] for i in planes for j in flights)

    for j in flights:
        prob += pulp.lpSum(x[(i, j)] for i in planes) == 1

    for i in planes:
        for j1 in flights:
            for j2 in flights:
                if j2 <= j1:
                    continue
                if blocked_slots(j1) & blocked_slots(j2):
                    prob += x[(i, j1)] + x[(i, j2)] <= 1

    solver = pulp.PULP_CBC_CMD(msg=0)
    prob.solve(solver)

    if pulp.LpStatus[prob.status] != "Optimal":
        return jsonify({"error": "No optimal solution found"}), 400

    total_cost = pulp.value(prob.objective)

    # Build schedule
    schedule = []
    for i in planes:
        assigned = [j for j in flights if pulp.value(x[(i, j)]) is not None and pulp.value(x[(i, j)]) > 0.5]
        assigned_sorted = sorted(assigned, key=lambda j: dept_slot[j])
        for j in assigned_sorted:
            start = dept_slot[j]
            end = start + 2 * duration[j] + 1
            schedule.append({
                "plane": i,
                "flight": j,
                "departure": slot_to_time(start),
                "return": slot_to_time(end),
                "duration": f"{2*duration[j]+1}h",
                "cost": round(C[(i, j)], 2)
            })

    # Cost breakdown
    tf = td = tn = tm = tr = 0.0
    for i in planes:
        for j in flights:
            if pulp.value(x[(i, j)]) is not None and pulp.value(x[(i, j)]) > 0.5:
                tf += FuelBurn[i] * Distance[j] * FUEL_PRICE * 2
                td += alpha_d[j] * Delay[(i, j)]
                tn += night_cost[j] if is_night[j] else 0
                tm += RepairCost[i] + beta_r[i] * REPAIR_TIME
                tr += FerryFuel[i] + CREW_COST + SlotCost[j]

    return jsonify({
        "status": "Optimal",
        "total_cost": round(total_cost, 2),
        "airport": airport,
        "planes": N,
        "schedule": schedule,
        "cost_breakdown": {
            "fuel": round(tf, 2),
            "delays": round(td, 2),
            "night": round(tn, 2),
            "maintenance": round(tm, 2),
            "repositioning": round(tr, 2)
        }
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)