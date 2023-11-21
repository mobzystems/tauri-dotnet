import { useEffect, useState } from "react";
import Greet from "./Greet.tsx";
import useBackendService from "./useBackendService.tsx";

function App() {
  // Start with '' to automatically start the backend or with a specific URL
  const [url, setUrl] = useState<string | undefined>('');
  const serviceState = useBackendService({
    url: url,
    // Set this to true to see more information in the Console
    // verbose: true,

    // startupMessage: /\bNow listening on:\s+(https?:\/\/\S+)/, // The default
    // startupMessage: undefined, // Also the default
    // startupMessage: /Now NOT listening on:/, // Does not work. Use to test the timeout

    // Expect the backend to supply the startup message within x ms. Set to undefined to skip the running check
    timeout: 3000
  });
  // This is the actual URL the backend started on if we specified a URL of ''
  const [startedUrl, setStartedUrl] = useState<string>();
  // The backend response to GET / once the service becomes 'running'
  const [homeResponse, setHomeResponse] = useState<string>();

  useEffect(() => {
    if (serviceState === undefined) {
      console.log("App: backend service state not set");
    } else {
      console.log(`App: backend service state is '${serviceState.state}'`);
      switch (serviceState.state) {
        case 'started': // The backend was started but is not yet running
          break;
        case 'running': // The backend is running
          if (serviceState.url !== undefined)
            setStartedUrl(serviceState.url);
          else
            setStartedUrl(url); // Assume we're running on the same url we requested
          break;
        case 'stopped': // The backend was stopped manually
          setStartedUrl(undefined);
          break;
        case 'error': // The backend failed to start
        case 'exited': // The backend has exited spontaneously
          setUrl(undefined);
          setStartedUrl(undefined);
          break;
        default:
          console.warn(`Unknown backend service state: ${serviceState.state}`);
          break;
      }
    }
  }, [serviceState]);

  useEffect(() => {
    setHomeResponse(undefined);
    if (startedUrl !== undefined)
      fetch(startedUrl).then(r => r.text()).then(t => setHomeResponse(t));
  }, [startedUrl]);

  function BackendServiceStatus() {
    return (<div style={{ backgroundColor: 'lightgray', padding: '1rem' }}>
      {serviceState === undefined
        ?
        <p>Starting...</p>
        :
        <>
          <p>Backend is state is <strong>{serviceState.state}</strong></p>
          {serviceState.url !== undefined &&
            <p>Startup line was '<strong>{serviceState.url}</strong>'</p>
          }
          {(serviceState.state === 'started' || serviceState.state === 'running')
            ? <>
              <button onClick={() => setUrl(undefined)}>Stop</button>
            </>
            : <>
              Start server on port:
              <button onClick={() => setUrl('http://localhost:1420')}>1420</button>
              <button onClick={() => setUrl('http://localhost:5000')}>5000</button>
              <button onClick={() => setUrl('http://localhost:5010')}>5010</button>
              <button onClick={() => setUrl('http://localhost:50153')}>50153</button>
              <button onClick={() => setUrl('')}>Auto</button>
            </>
          }
          <p>URL is <strong>{url === '' ? '(automatic)' : url}</strong></p>
          {homeResponse !== undefined && <p>Backend 'GET /' returned '<strong>{homeResponse}</strong>'</p>}
        </>
      }
    </div>);
  }

  return (<>
    {startedUrl !== undefined &&
      <Greet url={startedUrl} />
    }
    <BackendServiceStatus />
  </>);
}

export default App;
