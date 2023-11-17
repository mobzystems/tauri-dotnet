import { Child, Command } from "@tauri-apps/api/shell";

export type BackendServiceState = 'stopped' | 'started' | 'running';

// Safari does not support static class fields!
// We have to leave these as module variables then
let _state: BackendServiceState = 'stopped';
let _process: Child | undefined = undefined;

export class BackendService {
    static sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    /***
     * Start the service at the supplied url (passed as --urls argument)
     * Can only be called when state === 'stopped' and process is undefined
     * Returns new state: either 'started' if successful, or 'stopped' if not
     */
    static async start(url: string) {
        console.log(`Starting service, state is ${_state}`);
        if (_state !== 'stopped' || _process !== undefined)
            return _state

        // Change state ASAP to prevent others starting another instance with us
        _state = 'started';

        try {
            const command = new Command('services', ['--urls', url]);

            let ready = false; // Set to true by output to console

            // Set up event handlers:
            command.on('close', data => {
                console.log(`command finished with code ${data.code} and signal ${data.signal}`);
            });
            command.on('error', error => console.error(`command error: "${error}"`));
            command.stdout.on('data', (line: string) => {
                console.log(`command stdout: "${line.trim()}"`);
                if (/Now listening on:/.test(line)) {
                    ready = true;
                }
            });
            command.stderr.on('data', (line: string) => {
                console.log(`command stderr: "${line.trim()}"`);
            });

            const process = await command.spawn();

            _process = process;

            console.log(`BackendService: process #${process.pid} started`);

            for (let i = 1; i <= 10; i++) {
                if (ready) {
                    console.log(`BackendService: ready (#${i})`);
                    break;
                }
                await this.sleep(500)
            }

            if (!ready) {
                _state = 'stopped';
            }
        }
        catch (error: any) {
            _state = 'stopped';

            console.log(`BackendService: failed to start process: '${error}'`);
        }

        return _state;
    }

    /***
     * Wait until a test URL returns an OK response
     * Can only be called when state === 'started'.
     * Sets state to 'running' when done, or 'stopped' if failed after retries
    */
    static async waitUntilReady(testUrl: string) {
        if (_state !== 'started')
            return _state;

        let success = false;
        for (let count = 0; count < 10; count++) {
            try {
                const response = await fetch(testUrl, { method: 'POST' });
                if (response.ok) {
                    var text = await response.text();
                    console.log(`Backend responded with '${text}'`);
                    success = true;
                    break;
                }
            }
            catch (error: any) {
                console.log(`BackendService: test URL error '${error}'`);
            }
            console.log(`BackendService: waiting for server... (${count + 1})`);
            await this.sleep(500);
        }
        if (success) {
            // await sleep(5000); // For testing
            console.log(`BackendService: service started successfully`);
            _state = 'running';
        } else {
            console.log(`BackendService: service was NOT started successfully`);
            await this.stop();
        }
        return _state;
    }

    /***
     * Stops the service. Can only be called when state === 'stopped' AND the process is undefined
     * Sets state to 'stopped' and process to undefined, even on error
     */
    static async stop() {
        if (_state === 'stopped' || _process === undefined)
            return _state;

        try {
            await _process?.kill();
            console.log(`BackendService: stopped process #${_process.pid}`);
        }
        catch (error: any) {
            console.log(`BackendService: error stopping process #${_process.pid}`);
        }

        _state = 'stopped';
        _process = undefined;

        return _state;
    }
}
