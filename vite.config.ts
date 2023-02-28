import { UserConfigExport } from "vite";
import { app } from "./mockRobot";

export default <UserConfigExport>{
    plugins: [{
        name: "mock-robot-api",
        configureServer(server) {
            server.middlewares.use("/api", app);
        }
    }],
};