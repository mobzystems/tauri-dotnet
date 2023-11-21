import { useEffect, useRef, useState } from "react";
import { Child, Command } from "@tauri-apps/api/shell";

type ProcessState = 'notstarted' | 'started' | 'running' | 'exited' | 'error' | 'stopped';

export interface ServiceState {
    state: ProcessState;
    startupLine?: string;
}

interface BackgroundProcessProps {
    url: string,
    verbose?: boolean,
    startupMessage?: RegExp,
    timeout?: number,
    notifyState: (state: ServiceState) => void
}

class BackgroundProcess {
    // When the backend is started on this URL, it will choose a port automatically
    static AUTOMATIC_URL = 'http://127.0.0.1:0';

    private url: string;
    private verbose: boolean;
    private startupMessage: RegExp;
    private timeout?: number;
    private notifyState: (state: ServiceState) => void;

    constructor(props: BackgroundProcessProps) {
        this.url = props.url === '' ? BackgroundProcess.AUTOMATIC_URL : props.url;
        this.startupMessage = props.startupMessage || /Now listening on:/;
        this.verbose = props.verbose || false;
        this.timeout = props.timeout;
        this.notifyState = props.notifyState;

        this.startProcess(this.url);
    }

    private command?: Command;
    private process?: Child;
    public state: ServiceState = { state: 'notstarted', startupLine: undefined };
    // A setTimeout number for the timeout after the backend is started
    // within which we should have a startup message
    private startupTimer?: number;

    private log = (message: string) => { if (this.verbose) console.log(`useBackendProcess: ${message}`); }

    public setState = (state: ProcessState, startupLine?: string) => {
        this.state = { state: state, startupLine: startupLine };
        this.notifyState(this.state);
    }

    private onClose = (data: any) => {
        this.log(`command finished with code ${data.code} and signal ${data.signal}.`);

        if (this.state.state === 'running') {
            this.log(`Changing state 'running' --> 'exited'`);
            this.setState('exited');
        } else {
            this.log(`Setting state '${this.state}' --> 'error'`);
            this.clearTimerIfSet();
            this.setState('error');
        }
    };
    private onError = (error: any) => { console.error(`Command error: "${error}"`); }
    private onStdOut = (line: string) => {
        this.log(`Command stdout: "${line.trim()}"`);
        if (this.startupMessage.test(line)) {
            this.log(`Found startup line '${line.trimEnd()}'`);
            // Cancel the timeout
            if (this.startupTimer !== undefined) {
                this.clearTimerIfSet();

                if (this.state.state === 'started') {
                    this.setState('running', line);
                } else {
                    this.log(`WARNING: expected state 'started' but found state '${this.state}'`)
                }

            }
        }
    }
    private onStdErr = (line: string) => { this.log(`Command stderr: "${line.trim()}"`); }

    private clearTimerIfSet = () => {
        if (this.startupTimer !== undefined) {
            // console.log(`Clearing timer #${startupTimer.current}`);
            clearTimeout(this.startupTimer);
            this.startupTimer = undefined;
        }
    }

    private startProcess = async (url: string): Promise<void> => {
        try {
            this.command = new Command('services', ['--urls', url]);

            // Set up event handlers:
            this.command.on('close', this.onClose);
            this.command.on('error', this.onError);
            this.command.stdout.on('data', this.onStdOut);
            this.command.stderr.on('data', this.onStdErr);

            this.process = await this.command.spawn();

            this.log(`Process #${this.process.pid} started, setting state to 'started'`);
            this.setState('started');

            // Set a timeout to detect a non-starting backend:
            if (this.timeout !== undefined) {
                const timerId = setTimeout(() => {
                    this.log(`Timer #${this.startupTimer} elapsed. State is '${this.state}'`);
                    if (this.state.state === 'started') {
                        // Kill the process here
                        this.log(`Setting state to 'error' because of timeout`);
                        this.setState('error');
                    }
                }, this.timeout);
                // console.log(`Setting timer #${timerId}`);
                this.startupTimer = timerId;
            } else {
                // No timeout or no startup message - go directly to 'running'
                this.setState('running');
            }
        }
        catch (error: any) {
            this.log(`Failed to start process: '${error}', setting state to 'error'`);
            this.clearTimerIfSet();
            this.setState('error');
        }
    }

    stopProcess = async () => {
        if (this.process !== undefined) {
            if (this.command !== undefined) {
                // Remove Command event handlers:
                this.command.off('close', this.onClose);
                this.command.off('error', this.onError);
                this.command.stdout.off('data', this.onStdOut);
                this.command.stderr.off('data', this.onStdErr);
            }
            const pid = this.process.pid;
            this.log(`Killing process #${pid}...`);
            await this.process.kill();
            this.log(`Process #${pid} killed.`);
            // Unset the command and process
            this.command = undefined;
            this.process = undefined;
            this.setState('stopped');
        }
    }
}

export default function useBackendService(props: {
    url?: string,
    verbose?: boolean,
    startupMessage?: RegExp,
    timeout?: number
}) {
    const [currentState, setCurrentState] = useState<ServiceState>();
    // const [nextState, setNextState] = useState<ServiceState>();

    // Two background processes, one for the current process and one for the next process
    // When switching URL's, the current process is terminated and the next process is started
    const currentProcess = useRef<BackgroundProcess>();
    // const nextProcess = useRef<BackgroundProcess>();

    // The current URL we're trying to start. Used to prevent the backend
    // from being started multiple times in strict mode
    const currentUrl = useRef<string>();

    const log = (message: string) => {
        if (props?.verbose === true)
            console.log(`useBackendProcess: ${message}`)
    }

    useEffect(() => {
        if (props.url === currentUrl.current) {
            log(`Ignoring URL change '${props.url}'`);
            return;
        }
        log(`Changing URL from '${currentUrl.current}' to '${props.url}'`);
        // Remember this URL as the 'current' one
        currentUrl.current = props.url;

        if (props.url === undefined) {
            // URL changes to undefined - stop the current service
            if (currentProcess.current !== undefined) {
                log("Stopping Current");
                currentProcess.current.stopProcess().then(() => currentProcess.current = undefined);
            }
        } else if (currentProcess.current === undefined) {
            // URL changes to not undefined. Start the current service
            // or start a swap
            log("Starting new process on Current");
            currentProcess.current = new BackgroundProcess({ ...props, url: props.url, notifyState: (state) => setCurrentState(state) });
        }
    }, [props.url]);

    useEffect(() => {
        log(`Current state: '${currentState?.state}' (${currentProcess.current})`);
    }, [currentState]);

    return currentProcess.current?.state ?? { state: 'stopped' };
}