import { useEffect, useState } from "react";
import Greet from "./Greet.tsx";
import useBackendService from "./useBackendService.tsx";

function App() {
  const [url, setUrl] = useState<string | undefined>('');
  const serviceState = useBackendService({
    url: url,
    // verbose: true,
    // startupMessage: /Now listening on:/
  });
  // This is the actual URL the backend started on if we specified a URL of ''
  const [startedUrl, setStartedUrl] = useState<string>();

  useEffect(() => {
    if (serviceState === undefined) {
      console.log("App: backend service state not set");
    } else {
      console.log(`App: backend service state is ${serviceState.state}`);
      switch (serviceState.state) {
        case 'running':
          setStartedUrl(serviceState.startupLine!.trim().substring(17));
          break;
        default:
          setStartedUrl(undefined);
          break;
      }
    }
  }, [serviceState]);

  useEffect(() => {
    if (startedUrl !== undefined)
      fetch(startedUrl).then(r => r.text()).then(t => console.log(`Backend says: '${t}'`));
  }, [startedUrl]);

  function BackendServiceStatus() {
    return (<div style={{ backgroundColor: 'lightgray', padding: '1rem' }}>
      {serviceState === undefined
        ?
        <p>Starting...</p>
        :
        <>
          <p>Backend is state is {serviceState.state}</p>
          {serviceState.startupLine !== undefined &&
            <p>Startup line was {serviceState.startupLine}</p>
          }
          <button onClick={() => setUrl('http://localhost:1420')}>1420</button>
          <button onClick={() => setUrl('http://localhost:5000')}>5000</button>
          <button onClick={() => setUrl('http://localhost:5010')}>5010</button>
          <button onClick={() => setUrl('http://localhost:50153')}>50153</button>
          <button onClick={() => setUrl('')}>Auto</button>
          <button onClick={() => setUrl(undefined)}>Stop</button>
          <p>URL is {url}</p>
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
