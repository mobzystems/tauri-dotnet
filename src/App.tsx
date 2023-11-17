import { useEffect, useState } from "react";
import { BackendService, BackendServiceState } from './BackendService.ts';
import Greet from "./Greet.tsx";

function App() {
  // Set to 'running' to test with a running service, i.e. from Visual Studio
  const [backendState, setBackendState] = useState<BackendServiceState>();
  const URL = 'http://localhost:50053'; // 42361

  useEffect(() => {

    console.log(`Backend state is now '${backendState}'`);

    switch (backendState) {
      case undefined:
        // If the state is undefined, the service has not been started.
        // Start it, then set the state. Normally this would be 'started',
        // but in case of an error it will be 'stopped'
        BackendService.start(URL).then(
          state => setBackendState(state)
        );
        break;

      case 'started':
        // If the state is 'started', we still don't know of the service is responding.
        // Wait for that to happen first. Again, state may be 'stopped' or 'running'
        BackendService.waitUntilReady(URL).then(
          state => setBackendState(state)
        );
        break;

      case 'running':
        // The state is now 'running'. Configure all services dependent on it
        // and initialize the app
        // ExpressionService.BASE_URL = URL;
        break;
    }
  }, [backendState]);

  return (<>
    {backendState === 'running' ?
      <Greet />
      :
      <>
        <p>Backend state is '{backendState}'</p>
      </>
    }
  </>);
}

export default App;
