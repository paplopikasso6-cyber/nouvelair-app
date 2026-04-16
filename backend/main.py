from flask import Flask, request, jsonify
from flask_cors import CORS
import pulp
import random
import openpyxl
import io

app = Flask(__name__)
CORS(app)

USERS = {"admin": "password123"}

# ─────────────────────────────────────────────
# HARDCODED COSTS (set by operator)
# ─────────────────────────────────────────────
PARKING_COST_PER_HOUR     = 50
REPOSITIONING_MIN         = 500
REPOSITIONING_MAX         = 1500
HANDLING_MIN              = 2500
HANDLING_MAX              = 3500
CATERING_PER_FLIGHT       = 3190
CATERING_REFILL           = 3190   # if AOG > 7h
COMPENSATION_SHORT        = 250    # delay < 3h
COMPENSATION_LONG         = 600    # delay > 3h

SLOT_START = 8
M_FLIGHTS  = 8

duration = {1:3, 2:2, 3:2, 4:1, 5:2, 6:2, 7:1, 8:3}
dept_slot = {1:1, 2:1, 3:6, 4:8, 5:8, 6:11, 7:11, 8:13}

def slot_to_time(s):
    hour = SLOT_START + s - 1
    if hour >= 24:
        return f"+1j {hour - 24:02d}:00"
    return f"{hour:02d}:00"

def blocked_slots(j, delay=0):
    start = dept_slot[j] + delay
    total = 2 * duration[j] + 1
    return set(range(start, start + total))

# ─────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    if USERS.get(username) == password:
        return jsonify({"success": True, "token": "dummy-token-123"})
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

# ─────────────────────────────────────────────
# FLIGHT PLANNING
# ─────────────────────────────────────────────
@app.route("/api/optimize", methods=["POST"])
def optimize():
    N = int(request.form.get("planes", 3))
    file = request.files.get("file")

    flights_data = []
    if file:
        wb = openpyxl.load_workbook(io.BytesIO(file.read()))
        ws = wb.active
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row[0]:
                flights_data.append({
                    "flight_no": row[0],
                    "from": row[1],
                    "to": row[2],
                    "duration": float(row[3])
                })
    else:
        # fallback to default flights
        flights_data = [
            {"flight_no": f"NV10{j}", "from": "TUN", "to": "DST", "duration": duration[j]}
            for j in range(1, M_FLIGHTS + 1)
        ]

    random.seed(42)
    planes  = list(range(1, N + 1))
    flights = list(range(1, len(flights_data) + 1))

    dur     = {j: flights_data[j-1]["duration"] for j in flights}
    d_slot  = {j: random.randint(1, 8) for j in flights}

    def b_slots(j):
        start = d_slot[j]
        total = int(2 * dur[j] + 1)
        return set(range(start, start + total))

    peak = max(sum(1 for j in flights if s in b_slots(j)) for s in range(1, 25))
    if peak > N:
        return jsonify({"error": f"Infeasible: {peak} simultaneous flights > {N} planes"}), 400

    FuelBurn    = {i: round(random.uniform(3.5, 5.0), 2) for i in planes}
    RepairCost  = {i: round(random.uniform(500, 1500), 2) for i in planes}
    FerryFuel   = {i: round(random.uniform(200, 600), 2) for i in planes}
    beta_r      = {i: round(random.uniform(50, 150), 2) for i in planes}
    Distance    = {j: round(dur[j] * random.uniform(700, 900), 2) for j in flights}
    alpha_d     = {j: round(random.uniform(10, 50), 2) for j in flights}
    night_cost  = {j: round(random.uniform(100, 400), 2) for j in flights}
    is_night    = {j: (d_slot[j] >= 10) for j in flights}
    REPAIR_TIME = round(random.uniform(0, 4), 2)
    CREW_COST   = round(random.uniform(800, 1500), 2)
    FUEL_PRICE  = round(random.uniform(0.80, 1.20), 4)
    Delay       = {(i,j): round(random.uniform(0, 45), 2) for i in planes for j in flights}
    SlotCost    = {j: round(random.uniform(50, 300), 2) for j in flights}
    Handling    = {j: round(random.uniform(HANDLING_MIN, HANDLING_MAX), 2) for j in flights}
    Repos       = {j: round(random.uniform(REPOSITIONING_MIN, REPOSITIONING_MAX), 2) for j in flights}

    def compute_cost(i, j):
        C_f = FuelBurn[i] * Distance[j] * FUEL_PRICE * 2
        C_d = alpha_d[j] * Delay[(i, j)]
        C_n = night_cost[j] if is_night[j] else 0.0
        C_m = RepairCost[i] + beta_r[i] * REPAIR_TIME
        C_r = FerryFuel[i] + CREW_COST + SlotCost[j]
        C_h = Handling[j]
        C_p = Repos[j]
        C_cat = CATERING_PER_FLIGHT
        return C_f + C_d + C_n + C_m + C_r + C_h + C_p + C_cat

    C = {(i,j): compute_cost(i,j) for i in planes for j in flights}

    prob = pulp.LpProblem("Nouvelair_Planning", pulp.LpMinimize)
    x = pulp.LpVariable.dicts("x", [(i,j) for i in planes for j in flights], cat="Binary")

    prob += pulp.lpSum(C[(i,j)] * x[(i,j)] for i in planes for j in flights)

    for j in flights:
        prob += pulp.lpSum(x[(i,j)] for i in planes) == 1

    for i in planes:
        for j1 in flights:
            for j2 in flights:
                if j2 <= j1: continue
                if b_slots(j1) & b_slots(j2):
                    prob += x[(i,j1)] + x[(i,j2)] <= 1

    solver = pulp.PULP_CBC_CMD(msg=0)
    prob.solve(solver)

    if pulp.LpStatus[prob.status] != "Optimal":
        return jsonify({"error": "No optimal solution found"}), 400

    total_cost = pulp.value(prob.objective)
    schedule = []
    for i in planes:
        assigned = sorted(
            [j for j in flights if pulp.value(x[(i,j)]) is not None and pulp.value(x[(i,j)]) > 0.5],
            key=lambda j: d_slot[j]
        )
        for j in assigned:
            start = d_slot[j]
            end   = start + int(2 * dur[j] + 1)
            schedule.append({
                "plane": i,
                "flight_no": flights_data[j-1]["flight_no"],
                "from": flights_data[j-1]["from"],
                "to": flights_data[j-1]["to"],
                "departure": slot_to_time(start),
                "return": slot_to_time(end),
                "duration": f"{int(2*dur[j]+1)}h",
                "cost": round(C[(i,j)], 2)
            })

    tf = td = tn = tm = tr = th = tp = tc = 0.0
    for i in planes:
        for j in flights:
            if pulp.value(x[(i,j)]) is not None and pulp.value(x[(i,j)]) > 0.5:
                tf += FuelBurn[i] * Distance[j] * FUEL_PRICE * 2
                td += alpha_d[j] * Delay[(i,j)]
                tn += night_cost[j] if is_night[j] else 0
                tm += RepairCost[i] + beta_r[i] * REPAIR_TIME
                tr += FerryFuel[i] + CREW_COST + SlotCost[j]
                th += Handling[j]
                tp += Repos[j]
                tc += CATERING_PER_FLIGHT

    return jsonify({
        "status": "Optimal",
        "total_cost": round(total_cost, 2),
        "planes": N,
        "schedule": schedule,
        "cost_breakdown": {
            "fuel": round(tf, 2),
            "delays": round(td, 2),
            "night": round(tn, 2),
            "maintenance": round(tm, 2),
            "repositioning": round(tr + tp, 2),
            "handling": round(th, 2),
            "catering": round(tc, 2)
        }
    })

# ─────────────────────────────────────────────
# AOG
# ─────────────────────────────────────────────
@app.route("/api/aog", methods=["POST"])
def aog():
    data        = request.json
    N           = int(data.get("planes", 3))
    aog_plane   = int(data.get("aog_plane", 1))
    aog_airport = data.get("aog_airport", "TUN")
    repair_cost = float(data.get("repair_cost", 1000))
    repair_time = float(data.get("repair_time", 4))

    random.seed(42)
    planes  = list(range(1, N + 1))
    flights = list(range(1, M_FLIGHTS + 1))

    # Parking cost based on repair time
    parking_total = PARKING_COST_PER_HOUR * repair_time

    # Catering: refill if AOG > 7h
    catering_total = CATERING_PER_FLIGHT
    if repair_time > 7:
        catering_total += CATERING_REFILL

    # Passenger compensation
    compensation = COMPENSATION_LONG if repair_time > 3 else COMPENSATION_SHORT
    compensation_total = compensation * M_FLIGHTS

    FuelBurn    = {i: round(random.uniform(3.5, 5.0), 2) for i in planes}
    RepairCost  = {i: round(random.uniform(500, 1500), 2) for i in planes}
    FerryFuel   = {i: round(random.uniform(200, 600), 2) for i in planes}
    beta_r      = {i: round(random.uniform(50, 150), 2) for i in planes}
    Distance    = {j: round(duration[j] * random.uniform(700, 900), 2) for j in flights}
    alpha_d     = {j: round(random.uniform(10, 50), 2) for j in flights}
    night_cost  = {j: round(random.uniform(100, 400), 2) for j in flights}
    is_night    = {j: (dept_slot[j] >= 10) for j in flights}
    REPAIR_TIME_BASE = round(random.uniform(0, 4), 2)
    CREW_COST   = round(random.uniform(800, 1500), 2)
    FUEL_PRICE  = round(random.uniform(0.80, 1.20), 4)
    Delay       = {(i,j): round(random.uniform(0, 45), 2) for i in planes for j in flights}
    SlotCost    = {j: round(random.uniform(50, 300), 2) for j in flights}
    Handling    = {j: round(random.uniform(HANDLING_MIN, HANDLING_MAX), 2) for j in flights}
    Repos       = {j: round(random.uniform(REPOSITIONING_MIN, REPOSITIONING_MAX), 2) for j in flights}

    def compute_cost(i, j, delay=0, extra=0):
        C_f = FuelBurn[i] * Distance[j] * FUEL_PRICE * 2
        C_d = alpha_d[j] * (Delay[(i,j)] + delay * 60)
        C_n = night_cost[j] if is_night[j] else 0.0
        C_m = RepairCost[i] + beta_r[i] * REPAIR_TIME_BASE
        C_r = FerryFuel[i] + CREW_COST + SlotCost[j]
        C_h = Handling[j]
        C_p = Repos[j]
        return C_f + C_d + C_n + C_m + C_r + C_h + C_p + extra

    def run_optimizer(available_planes, delay=0, extra=0):
        C = {(i,j): compute_cost(i,j,delay,extra) for i in available_planes for j in flights}
        prob = pulp.LpProblem("AOG", pulp.LpMinimize)
        x = pulp.LpVariable.dicts("x", [(i,j) for i in available_planes for j in flights], cat="Binary")
        prob += pulp.lpSum(C[(i,j)] * x[(i,j)] for i in available_planes for j in flights)
        for j in flights:
            prob += pulp.lpSum(x[(i,j)] for i in available_planes) == 1
        for i in available_planes:
            for j1 in flights:
                for j2 in flights:
                    if j2 <= j1: continue
                    if blocked_slots(j1,delay) & blocked_slots(j2,delay):
                        prob += x[(i,j1)] + x[(i,j2)] <= 1
        solver = pulp.PULP_CBC_CMD(msg=0)
        prob.solve(solver)
        if pulp.LpStatus[prob.status] != "Optimal":
            return None
        total = pulp.value(prob.objective)
        schedule = []
        for i in available_planes:
            assigned = sorted(
                [j for j in flights if pulp.value(x[(i,j)]) is not None and pulp.value(x[(i,j)]) > 0.5],
                key=lambda j: dept_slot[j]
            )
            for j in assigned:
                start = dept_slot[j] + delay
                end   = start + 2 * duration[j] + 1
                schedule.append({
                    "plane": i,
                    "flight": j,
                    "departure": slot_to_time(start),
                    "return": slot_to_time(end),
                    "cost": round(C[(i,j)], 2)
                })
        return {"total_cost": round(total, 2), "schedule": schedule}

    # Option 1 — Wait for maintenance
    delay_slots = int(repair_time)
    opt1 = run_optimizer(planes, delay=delay_slots)
    extra1 = repair_cost + parking_total + catering_total + compensation_total
    option1 = {
        "title": "🔧 Wait for Maintenance",
        "description": f"Plane fixed after {repair_time}h at {aog_airport}. All flights delayed.",
        "extra_cost": round(extra1, 2),
        "total_cost": round(opt1["total_cost"] + extra1, 2) if opt1 else None,
        "schedule": opt1["schedule"] if opt1 else [],
        "feasible": opt1 is not None,
        "breakdown": {
            "repair": repair_cost,
            "parking": parking_total,
            "catering": catering_total,
            "compensation": compensation_total
        }
    }

    # Option 2 — Use fleet plane
    remaining = [i for i in planes if i != aog_plane]
    opt2 = run_optimizer(remaining) if remaining else None
    extra2 = round(random.uniform(REPOSITIONING_MIN, REPOSITIONING_MAX), 2)
    option2 = {
        "title": "✈️ Use Fleet Plane",
        "description": f"Plane {aog_plane} grounded. Flights reassigned to {len(remaining)} remaining planes.",
        "extra_cost": extra2,
        "total_cost": round(opt2["total_cost"] + extra2, 2) if opt2 else None,
        "schedule": opt2["schedule"] if opt2 else [],
        "feasible": opt2 is not None,
        "breakdown": {
            "repositioning": extra2
        }
    }

    # Option 3 — Rent a plane
    rental_id = max(planes) + 1
    planes_with_rental = remaining + [rental_id]
    FuelBurn[rental_id]  = round(random.uniform(4.0, 5.5), 2)
    RepairCost[rental_id] = 0
    FerryFuel[rental_id]  = 0
    beta_r[rental_id]     = 0
    Delay.update({(rental_id,j): round(random.uniform(0,45),2) for j in flights})
    Handling[rental_id]   = round(random.uniform(HANDLING_MIN, HANDLING_MAX), 2)
    Repos[rental_id]      = round(random.uniform(REPOSITIONING_MIN, REPOSITIONING_MAX), 2)
    rental_fee = round(random.uniform(8000, 15000), 2)
    opt3 = run_optimizer(planes_with_rental)
    extra3 = rental_fee + parking_total + catering_total + compensation_total
    option3 = {
        "title": "💸 Rent a Plane",
        "description": f"External aircraft rented. AOG plane {aog_plane} stays grounded.",
        "extra_cost": round(extra3, 2),
        "total_cost": round(opt3["total_cost"] + extra3, 2) if opt3 else None,
        "schedule": opt3["schedule"] if opt3 else [],
        "feasible": opt3 is not None,
        "breakdown": {
            "rental": rental_fee,
            "parking": parking_total,
            "catering": catering_total,
            "compensation": compensation_total
        }
    }

    options = [option1, option2, option3]
    feasible = [o for o in options if o["feasible"]]
    if feasible:
        best = min(feasible, key=lambda o: o["total_cost"])
        best["recommended"] = True

    return jsonify({
        "aog_plane": aog_plane,
        "aog_airport": aog_airport,
        "options": options
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
    