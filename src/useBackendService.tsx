import { useEffect, useState } from "react";
import { Child, Command } from "@tauri-apps/api/shell";

let currentUrl: string | undefined = undefined;

export default function useBackendService(props: {
    url: string | undefined
}) {
    const [isRunning, setIsRunning] = useState(false);
    const [command, setCommand] = useState<Command>();
    const [process, setProcess] = useState<Child>();
    // const [url, setUrl] = useState<string>();

    useEffect(() => {
        console.log(`props.url is '${props.url}', current url is '${currentUrl}'`);
        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
        let ready = false;

        const onClose = (data: any) => {
            console.log(`command finished with code ${data.code} and signal ${data.signal}`);
            setIsRunning(false);
        };
        const onError = (error: any) => {
            console.error(`command error: "${error}"`);
        }
        const onStdOut = (line: string) => {
            console.log(`command stdout: "${line.trim()}"`);
            if (/Now listening on:/.test(line)) {
                ready = true;
            }
        }
        const onStdErr = (line: string) => {
            console.log(`command stderr: "${line.trim()}"`);
        }

        const killProcessIfStarted = async () => {
            if (process !== undefined) {
                console.log(`BackendService: killing process #${process.pid}...`)
                await process.kill();
                if (command !== undefined) {
                    // Remove up event handlers:
                    command.off('close', onClose);
                    command.off('error', onError);
                    command.stdout.off('data', onStdOut);
                    command.stderr.off('data', onStdErr);
                }
                setProcess(undefined);
                setCommand(undefined);
                console.log(`BackendService: process #${process.pid} killed.`)
            }
        }

        if (props.url !== undefined) {
            if (props.url === currentUrl) {
                console.log(`BackendService: skip duplicate URL`);
            } else {
                // setUrl(props.url);
                currentUrl = props.url;
                (async function (url: string) {
                    try {
                        await killProcessIfStarted();

                        const _command = new Command('services', ['--urls', url]);

                        // Set up event handlers:
                        _command.on('close', onClose);
                        _command.on('error', onError);
                        _command.stdout.on('data', onStdOut);
                        _command.stderr.on('data', onStdErr);

                        ready = false;

                        const _process = await _command.spawn();

                        setCommand(_command);
                        setProcess(_process);

                        console.log(`BackendService: process #${_process.pid} started`);

                        for (let i = 1; i <= 10; i++) {
                            if (ready) {
                                console.log(`BackendService: ready (#${i})`);
                                return true;
                            }
                            console.log(`BackendService: try #${i}`);
                            await sleep(500)
                        }

                        // setUrl(undefined);
                        currentUrl = undefined;
                        return false;

                    }
                    catch (error: any) {
                        console.log(`BackendService: failed to start process: '${error}'`);
                        // setUrl(undefined);
                        currentUrl = undefined;
                        return false;
                    }

                })(props.url)
                    .then(isrunning => setIsRunning(isrunning));
            }
        } else {
            currentUrl = undefined;
            killProcessIfStarted(); // Let event onClose do: .then(() => setIsRunning(false));
        }

        // // Clean up
        // return () => {
        //     if (command !== undefined) {
        //         console.log('Backendservice: cleaning up...');
        //         // Remove up event handlers:
        //         command.off('close', onClose);
        //         command.off('error', onError);
        //         command.stdout.off('data', onStdOut);
        //         command.stderr.off('data', onStdErr);
        //         console.log('Backendservice: cleaned up.');
        //     }
        // }
    }, [props.url]);

    return isRunning;
}