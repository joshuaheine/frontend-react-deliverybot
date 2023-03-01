import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactDOM from 'react-dom';
import './app.css';
//@ts-ignore  
import buttonSound from "./assets/button-sound.wav";

interface Waypoints {
    [key: string]: {
        name: string;
        position: { x: number; y: number; z: number };
    };
}

interface RobotStatus {
    charge: number;
    charging: boolean;
    online: boolean;
    position: { x: number; y: number; theta: number; };
    lid: string;
    navigationState: string;
}

function App() {

    const [robotStatus, setRobotStatus] = useState<RobotStatus>();
    const [waypoints, setWaypoints] = useState<Waypoints>();
    const [selectedWaypoint, setSelectedWaypoint] = useState<string>();

    useEffect(() => {
        const fetchData = async () => {
            const [statusResponse, waypointsResponse] = await Promise.all([
                axios.get('/api/status'),
                axios.get('/api/map/waypoint')
            ]);
            setRobotStatus(statusResponse.data);
            setWaypoints(waypointsResponse.data);
        };
        fetchData();
    }, []);

    function playSound() {
        const audio = new Audio(buttonSound);
        audio.play();
    }

    const handleLidChange = async (lid: string) => {
        await axios.post('/api/lid', { lid });
        const { data } = await axios.get('/api/status');
        setRobotStatus(data);
        if (lid === 'close' && robotStatus?.position.x !== 0 && robotStatus?.position.y !== 0 && robotStatus?.position.theta !== 0) {
            await axios.post('/api/nav/goal', { waypoint: 'ADESqX9j_h6ujP4n'});
            const { data: status } = await axios.get('/api/status');
            setRobotStatus(status);
        }
    };

    const handleWaypointSelect = async (waypoint: string) => {
        setSelectedWaypoint(waypoint);
        const { data } = await axios.post('/api/nav/goal', { waypoint });
        if (data.result === 'success') {
            setSelectedWaypoint (undefined) ;
            if (robotStatus && robotStatus.lid === 'close') {
                await handleLidChange('open');
            }
        }
        const { data: status } = await axios.get('/api/status');
        setRobotStatus(status);
    };

    const handleNavigationCancel = () => {
        axios.post('/api/nav/cancel');
    };
    
    return (
        <div className="App">
            {robotStatus && (
                <div>
                    <h2>Robot Status</h2>
                    <p>Battery level: {robotStatus.charge}%</p>
                    <p>Charging: {robotStatus.charging ? 'Yes' : 'No'}</p>
                    <p>Online: {robotStatus.online ? 'Yes' : 'No'}</p>
                    <p>Position: ({robotStatus.position[0]}, {robotStatus.position[1]}, {robotStatus.position[2]})</p>
                    <p>Lid: {robotStatus.lid}</p>
                    <p>Navigation state: {robotStatus.navigationState}</p>
                </div>
            )}

            {waypoints && (
                <div>
                    <h2>Waypoints</h2>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {Object.keys(waypoints).map((waypointId) => (
                            <li key={waypointId}>
                                <button disabled={!robotStatus?.position || (robotStatus.position.x === 0 && robotStatus.position.y === 0 && robotStatus.position.theta === 0)} 
                                onClick={() => {handleWaypointSelect(waypointId);playSound();}}>
                                    {waypoints[waypointId].name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {selectedWaypoint && (
                <div>
                    <h2>Cancel On-Going Navigation</h2>
                    <button onClick={ () => {handleNavigationCancel();playSound();}}>Cancel</button>
                </div>
            )}

            <div>
                <h2>Lid Control</h2>
                <button disabled={robotStatus && robotStatus.lid === 'open'} onClick={() => {handleLidChange('open');playSound();}}>
                    Open Lid
                </button>
                <button disabled={robotStatus && robotStatus.lid === 'close'} onClick={() => {handleLidChange('close');playSound();}}>
                    Close Lid
                </button>
            </div>
        </div>);
}

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
);

export default App;
