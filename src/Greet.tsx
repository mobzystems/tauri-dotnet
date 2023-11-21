import { useState } from "react";

export default function Greet(props: { url: string }) {
    const [greetMsg, setGreetMsg] = useState("");
    const [name, setName] = useState("");

    async function greet() {
        fetch(props.url + '/greet', { method: 'POST', body: JSON.stringify({ name: name }), headers: { 'Content-Type': 'application/json' }}).then(r => r.text()).then(t => setGreetMsg(t));
    };

    return (<>
        <h1>Welcome to Tauri-DotNet!</h1>
        <p><i>Running on <strong>{props.url}</strong></i></p>

        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            value={name}
            placeholder="Enter a name..."
          />
          <button type="submit">Greet</button>
        </form>

        <pre>{greetMsg}</pre>
      </>);
}