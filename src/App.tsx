import { useEffect, useState } from "react";
import Greet from "./Greet.tsx";
import useBackendService from "./useBackendService.tsx";

function App() {
  const [url, setUrl] = useState<string | undefined>('http://localhost:50153');
  const serviceState = useBackendService({
    url: url,
    verbose: true,
    // startupMessage: /Now listening on/
  });

  useEffect(() => {
    if (serviceState === undefined) {
      console.log("App: backend service state not set");
    } else {
      console.log(`App: backend service state is ${serviceState.state}`);
      if (serviceState.state === 'running') {
        fetch(url!).then(r => r.text()).then(t => console.log(`Backend says: '${t}'`))
      }
    }
  }, [serviceState]);

  if (serviceState === undefined) {
    return <p>Starting...</p>
  } else {
    return (<>
      <p>Backend is state is {serviceState.state}</p>
      {serviceState.state === 'running' && url !== undefined &&
        <>
          <Greet url={url} />
          {serviceState.startupLine !== undefined &&
            <p>Startup line was {serviceState.startupLine}</p>
          }
        </>
      }
      <button onClick={() => setUrl('http://localhost:1420')}>1420</button>
      <button onClick={() => setUrl('http://localhost:5000')}>5000</button>
      <button onClick={() => setUrl('http://localhost:5010')}>5010</button>
      <button onClick={() => setUrl('http://localhost:50153')}>50153</button>
      <button onClick={() => setUrl(undefined)}>Stop</button>
      <p>URL is {url}</p>
    </>);
  }
}

export default App;
