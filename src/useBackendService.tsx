import { useEffect, useRef, useState } from "react";
import { Child, Command } from "@tauri-apps/api/shell";

export interface ServiceState {
    state: 'started' | 'running' | 'exited' | 'error' | 'stopped';
    startupLine?: string;
}

export default function useBackendService(props: {
    url?: string,
    verbose?: boolean,
    startupMessage?: RegExp,
    timeout?: number
}) {
    const [serviceState, setServiceState] = useState<ServiceState>();

    const startupMessage = props.startupMessage || /Now listening on:/;
    const verbose = props.verbose || false;

    // The current URL we're trying to start. Used to prevent the backend
    // from being started multiple times in strict mode
    const tryUrl = useRef<string>();
    // A setTimeout number for the timeout after the backend is started
    // within which we should have a startup message
    const startupTimer = useRef<number>();
    const currentCommand = useRef<{ command: Command, process: Child }>();
    // Sort of a hack. The onClose handler cannot see which command it is that's closed
    // If this value is true, the next onClose message is ignored
    const skipNextClose = useRef(false);

    const log = (message: string) => {
        if (verbose)
            console.log(`BackendService: ${message}`)
    }

    // When the backend is started on this URL, it will choose a port automatically
    const AUTOMATIC_URL = 'http://127.0.0.1:0';

    useEffect(() => {
        log(`Props.url is '${props.url}', current url is '${tryUrl.current}'`);

        const clearTimerIfSet = () => {
            if (startupTimer.current !== undefined) {
                // console.log(`Clearing timer #${startupTimer.current}`);
                clearTimeout(startupTimer.current);
                startupTimer.current = undefined;
            }
        }
        const onClose = (data: any) => {
            if (skipNextClose.current) {
                log("Skipping onClose");
                skipNextClose.current = false;
                return;
            }
            log(`command finished with code ${data.code} and signal ${data.signal}.`);
            setServiceState((prevState) => {
                // console.log(`command exited, previous state was '${prevState?.state}'`)
                if (prevState?.state === 'running') {
                    log(`Changing state 'running' --> 'exited'`);
                    return { state: 'exited' }
                } else if (prevState?.state === 'stopped') {
                    return prevState;
                } else {
                    log(`Setting state '${prevState?.state}' --> 'error'`);
                    tryUrl.current = undefined;
                    currentCommand.current = undefined;
                    clearTimerIfSet();
                    return { state: 'error' }
                }
            });
        };
        const onError = (error: any) => {
            console.error(`Command error: "${error}"`);
        }
        const onStdOut = (line: string) => {
            log(`Command stdout: "${line.trim()}"`);
            if (startupMessage.test(line)) {
                log(`Found startup line '${line.trimEnd()}'`);
                // Cancel the timeout
                // console.log(`Startup timer was #${startupTimer.current}`);
                if (startupTimer.current !== undefined) {
                    clearTimerIfSet();
                    setServiceState((prevState) => {
                        if (prevState?.state === 'started')
                            return { state: 'running', startupLine: line }
                        else {
                            log(`WARNING: expected state 'started' but found state '${prevState?.state}'`)
                            return prevState;
                        }
                    });
                }
            }
        }
        const onStdErr = (line: string) => {
            log(`Command stderr: "${line.trim()}"`);
        }

        const killProcessIfStarted = async (skipNext: boolean) => {
            if (currentCommand.current !== undefined) {
                const pid = currentCommand.current.process.pid;
                log(`Killing process #${pid}...`);
                skipNextClose.current = skipNext;
                await currentCommand.current.process.kill();
                // Remove Command event handlers:
                currentCommand.current.command.off('close', onClose);
                currentCommand.current.command.off('error', onError);
                currentCommand.current.command.stdout.off('data', onStdOut);
                currentCommand.current.command.stderr.off('data', onStdErr);
                // Unset the command and process
                currentCommand.current = undefined;
                log(`Process #${pid} killed.`);
            }
        }

        if (props.url === tryUrl.current) {
            log(`Skip duplicate URL`);
            return;
        }
        if (props.url === undefined) {
            // props.url is undefined - stop the service
            if (serviceState?.state === 'running' || serviceState?.state === 'started') {
                tryUrl.current = undefined;
                killProcessIfStarted(false);
                setServiceState({ state: 'stopped' });
            }
            return;
        }

        // We should start the service
        // Set the current url so we don't start twice in Strict mode
        tryUrl.current = props.url;
        (async function (url: string): Promise<void> {
            try {
                await killProcessIfStarted(true);

                const command = new Command('services', ['--urls', url]);

                // Set up event handlers:
                command.on('close', onClose);
                command.on('error', onError);
                command.stdout.on('data', onStdOut);
                command.stderr.on('data', onStdErr);

                currentCommand.current = { command: command, process: await command.spawn() };

                log(`Process #${currentCommand.current.process.pid} started, setting state to 'started'`);
                setServiceState(/*() => { return*/ { state: 'started' } /*}*/);

                // Set a timeout to detect a non-starting backend:
                if (props.timeout !== undefined) {
                    const timerId = setTimeout(() => {
                        setServiceState((prevState) => {
                            log(`Timer #${startupTimer.current} elapsed. State is '${prevState?.state}'`);
                            if (prevState !== undefined && prevState.state === 'started') {
                                // Kill the process here
                                log(`Setting state to 'error' because of timeout`);
                                killProcessIfStarted(false);
                                tryUrl.current = undefined;
                                return { state: 'error' }
                            } else {
                                return prevState;
                            }
                        });
                    }, props.timeout);
                    // console.log(`Setting timer #${timerId}`);
                    startupTimer.current = timerId;
                } else {
                    // No timeout or no startup message - go directly to 'running'
                    setServiceState({ state: 'running' });
                }
            }
            catch (error: any) {
                log(`Failed to start process: '${error}', setting state to 'error'`);
                tryUrl.current = undefined;
                clearTimerIfSet();
                setServiceState(/*() => { return*/ { state: 'error' } /*}*/);
                // return { state: 'error' };
            }
        })(props.url === '' ? AUTOMATIC_URL : props.url) // Use 127.0.0.1:0 if url is ''

    }, [props.url]);

    return serviceState;
}