import express from "express";
import { AsyncRouter } from "express-async-router";

export const app = express();
const router = AsyncRouter();
app.disable("x-powered-by");
app.use(express.json());
app.use(router);

router.use(req => {
    if(req.method === "POST") {
        console.log(`[api] ${req.method} ${req.url}`, req.body);
    }
});

const lidState = { "close": 1, "open": 1 };
const navState = { "idle": 1, "active": 1 };

const waypoints = {
    "ADESqX9j_h6ujP4n": {
        "name": "Home",
        "coord": [0, 0, 0],
    },
    "TCmL6LDD_2Q_-PVV": {
        "name": "Destination A",
        "coord": [2, 5, 0],
    },
    "D8HeuxtyNYw2AjAL": {
        "name": "Destination B",
        "coord": [6, 3, 0],
    }
};

const state = {
    lid: "close" as keyof typeof lidState,
    nav: "idle" as keyof typeof navState,
    position: [0, 0, 0]
};

function timeout(ms) {
    return new Promise(r => setTimeout(r, ms));
}

router.get("/status", (req, res) => {
    return res.json({
        charge: 70,
        charging: false,
        online: true,
        position: state.position,
        lid: state.lid,
        navigationState: state.nav,
    });
});

router.get("/map/waypoint", (req, res) => {
    return res.json(waypoints);
});

router.post("/lid", async ({ body: { lid, simTime } }, res) => {
    if (!lidState[lid]) throw Error(`invalid lid state ${lid}`);
    await timeout(Number.isFinite(simTime) ? simTime * 1000 : 2500);
    state.lid = lid;
    return res.json({});
});

router.post("/nav/goal", async ({ body: { waypoint, simTime } }, res) => {
    const w = waypoints[waypoint as keyof typeof waypoints];
    if (!w) throw Error(`invalid waypoint ${waypoint}`);
    
    // Bonus points: prevent race conditions when cancelling previos goal ;)
    if (state.nav === "active") {
        state.nav = "idle";
        await timeout(200);
    }
    
    state.nav = "active";
    let remainingSteps = Number.isFinite(simTime) ? simTime * 10 : 100;
    while (state.nav === "active" && remainingSteps > 0) {
        const dx = w.coord[0] - state.position[0];
        const dy = w.coord[1] - state.position[1];
        state.position = [
            state.position[0] + dx/remainingSteps,
            state.position[1] + dy/remainingSteps,
            state.position[2],
        ]
        remainingSteps--;
        await timeout(100);
    }
    
    return res.json({ result: remainingSteps === 0 ? "success" : "cancelled" });
});

router.post("/nav/cancel", async (req, res) => {
    state.nav = "idle";
    return res.json({});
});
