import { useEffect, useState } from "react";
import Greet from "./Greet.tsx";
import useBackendService from "./useBackendService.tsx";

function App() {
  const [url, setUrl] = useState<string | undefined>('http://localhost:50053');
  const isRunning = useBackendService({ url: url });

  // useEffect(() => {

  //   console.log(`Backend running is '${isRunning}'`);

  //   switch (backendState) {
  //     case undefined:
  //       // If the state is undefined, the service has not been started.
  //       // Start it, then set the state. Normally this would be 'started',
  //       // but in case of an error it will be 'stopped'
  //       BackendService.start(URL).then(
  //         state => setBackendState(state)
  //       );
  //       break;

  //     case 'started':
  //       // If the state is 'started', we still don't know of the service is responding.
  //       // Wait for that to happen first. Again, state may be 'stopped' or 'running'
  //       BackendService.waitUntilReady(URL).then(
  //         state => setBackendState(state)
  //       );
  //       break;

  //     case 'running':
  //       // The state is now 'running'. Configure all services dependent on it
  //       // and initialize the app
  //       // ExpressionService.BASE_URL = URL;
  //       break;
  //   }
  // }, [backendState]);

  useEffect(() => {
    console.log(`App: backend service running is ${isRunning}`);
    if (isRunning && url !== undefined) {
      fetch(url).then(r => r.text()).then(t => console.log(`Backend says: '${t}'`))
    }
  }, [isRunning]);

  return (<>
    {isRunning ?
      <Greet />
      :
      <>
        <p>Backend is {isRunning ? 'running' : 'stopped'}</p>
      </>
    }
    <button onClick={() => setUrl('http://localhost:5000')}>5000</button>
    <button onClick={() => setUrl('http://localhost:5010')}>5010</button>
    <button onClick={() => setUrl(undefined)}>Stop</button>
    <p>URL is { url }</p>
  </>);
}

export default App;
