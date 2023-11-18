import { useEffect, useState } from "react";
import { Child, Command } from "@tauri-apps/api/shell";

let currentUrl: string | undefined = undefined;

export interface ServiceState {
    state: 'started' | 'running' | 'exited' | 'error';
}

export default function useBackendService(props: {
    url?: string,
    verbose: boolean,
    startupMessage?: RegExp
}) {
    const [isRunning, setIsRunning] = useState<ServiceState>();
    const [command, setCommand] = useState<Command>();
    const [process, setProcess] = useState<Child>();

    const startupMessage = props.startupMessage || /Now listening on:/;
    const verbose = props.verbose || false;

    const log = (message: string) => {
        if (verbose)
            console.log(`BackendService: ${message}`)
    }

    useEffect(() => {
        log(`props.url is '${props.url}', current url is '${currentUrl}'`);

        // Helper function to sleep
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        // Flag signalling process responded
        let ready: boolean;
        let exited: boolean;

        const onClose = (data: any) => {
            log(`command finished with code ${data.code} and signal ${data.signal}`);
            setIsRunning({ state: 'exited' });
            exited = true;
        };
        const onError = (error: any) => {
            console.error(`command error: "${error}"`);
        }
        const onStdOut = (line: string) => {
            log(`command stdout: "${line.trim()}"`);
            if (startupMessage.test(line)) {
                ready = true;
            }
        }
        const onStdErr = (line: string) => {
            log(`command stderr: "${line.trim()}"`);
        }

        const killProcessIfStarted = async (_command: Command | undefined, _process: Child | undefined) => {
            if (_process !== undefined) {
                const pid = _process.pid;
                log(`killing process #${pid}...`)
                await _process.kill();
                if (_command !== undefined) {
                    // Remove up event handlers:
                    _command.off('close', onClose);
                    _command.off('error', onError);
                    _command.stdout.off('data', onStdOut);
                    _command.stderr.off('data', onStdErr);
                }
                // Unset the command and process
                setProcess(undefined);
                setCommand(undefined);
                log(`process #${pid} killed.`)
            }
        }

        if (props.url !== undefined) {
            if (props.url === currentUrl) {
                log(`skip duplicate URL`);
            } else {
                // Set the current url so we don't start twice in Strict mode
                currentUrl = props.url;
                (async function (url: string): Promise<ServiceState> {
                    try {
                        await killProcessIfStarted(command, process);

                        const _command = new Command('services', ['--urls', url]);

                        // Set up event handlers:
                        _command.on('close', onClose);
                        _command.on('error', onError);
                        _command.stdout.on('data', onStdOut);
                        _command.stderr.on('data', onStdErr);

                        ready = false;
                        exited = false;

                        const _process = await _command.spawn();

                        setCommand(_command);
                        setProcess(_process);

                        setIsRunning({ state: 'started'});

                        log(`process #${_process.pid} started`);

                        log(`waiting for startup message ${startupMessage}...`);
                        for (let i = 1; i <= 10; i++) {
                            if (ready) {
                                log(`message found (#${i})`);
                                return { state: 'running' };
                            }
                            if (exited)
                                break;
                            log(`try #${i}`);
                            await sleep(500)
                        }

                        // If the process has not responded, kill it
                        if (exited) {
                            setCommand(undefined);
                            setProcess(undefined);
                        } else
                            await killProcessIfStarted(_command, _process);
                        currentUrl = undefined;
                        return { state: 'error' };

                    }
                    catch (error: any) {
                        log(`failed to start process: '${error}'`);
                        currentUrl = undefined;
                        return { state: 'error' };
                    }

                })(props.url)
                    .then(state => setIsRunning(state));
            }
        } else {
            currentUrl = undefined;
            killProcessIfStarted(command, process);
        }

    }, [props.url]);

    return isRunning;
}