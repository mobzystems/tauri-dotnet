# tauridotnet

This project combines a React front-end with a .NET back-end using Tauri.

## Front-end

The front-end is a standard React app that builds into the dist directory.
On startup, it executes the .NET back-end using Tauri's shell API. Once started
the back-end service is available as a "normal" HTTP service.

## Back-end

The back-end is a normal .NET project. It can be located anywhere, as long as:

1. There is a single solution file (*.sln) in the root of the project (next to package.json)
2. This solution file contains one or more projects
3. The output of those projects (using OutDir and PublishDir in the .csproj file) goes into ./src-tauri/services:

```
<OutDir>..\src-tauri\services</OutDir>
<PublishDir>..\src-tauri\services</PublishDir>
```
## Tauri

To configure the back-end from tauri.conf.json:

1. Change:

```
"beforeDevCommand": "dotnet build && npm run dev",
"beforeBuildCommand": "dotnet publish -c Release && npm run build",
```

This will make sure the .NET solution gets built or published on

```
npm run tauri dev
npm run tauri build
```

The two relevant commands are, of course, `dotnet build`, which will build
the one and only solution in the root directory, regardless of the name, and
`dotnet publish -c Release` which will publish a Release version of the
project

2. Update the bundle section to include the services directory,
where the output of the .NET project is stored:

```
"bundle": {
  ...
  "resources": [
    "services"
  ]
},
```

This will ensure that the services directory is copied to where the app is executed.

3. Allow tauri to start the back-end:

```
"shell": {
  ...
  "scope": [
    ...
    {
      "name": "services",
      "cmd": "services/BackendService",
      "args": true,
      "sidecar": false
    }
  ]
},
```

This will allow the Mac to run services/BackendService and Windows to run services/BackendService.exe.

NOTE: BackendServices(.exe) is the name of the .NET back-end service. There should also be a BackendService.dll.

## Starting the backed service

See `App.tsx` for a way to start the backend service using `useBackendService.tsx`. If the backend URL is the empty string
the backend will choose its own port number which can be found in the `startupLine`.

## Publishing the backend using a profile

The default `dotnet publish` command will publish a framework dependent version of the backend. To change that,
create a publish profile (name it 'PublishProfile') and change `beforeBuildCommand` command to

`dotnet build /p:DeployOnBuild=true /p:PublishProfile=PublishProfile`

You can create multiple publish profiles but only the one specified in the `beforeBuildCommand` will be used
when running `npm run tauri build`.