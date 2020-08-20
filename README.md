# SaurusMC

Less plugins, more Minecraft.

Get the best Minecraft experience, mixing useful plugins with the official Minecraft Bedrock server software under-the-hood. 

You get the pure Minecraft experience, without any performance drawback or proxying. But you can also enhance this Minecraft experience with your favourite plugins and third-party apps.

Saurus uses Deno in order to get the best developer experience, allowing developers to quickly create plugins using JavaScript or TypeScript, or using WebAssembly to achieve native-like performances with their favourite language.

Plugins are very easy to write as they can be just one .ts file, and Saurus uses mutevents (by myself), an intelligent event system. 

Even more, Saurus allows players to connect to third-party apps, websites, and more using WebSockets in a totally secure manner.

## How does it work?

Saurus is a wrapper for an official (or not) Minecraft Bedrock server software. 

When you launch Saurus, it runs the server under-the-hood and interacts with it using stdin/stdout.

- No modification is done on the server, you get a pure native Minecraft Server. Allowing you to use the official features, and to update the server quickly and frequently.
- No proxying is done, players connect to the server directly. You get the best network performances and avoid security holes.

Players can't run commands directly, they have to use an app for interacting with the server. This allows a better experience for both players, who just have to click a button, and developers, who won't get headaches trying to explain how commands work.

## Getting started

- Clone this repo.

```bash
git clone https://github.com/hazae41/saurus
```

- Download the [Official Minecraft Bedrock server](https://www.minecraft.net/en-us/download/server/bedrock/) and install it in a `minecraft` folder. **Then, follow the bundled how to guide to configure the server**.

- Install [Deno](https://deno.land/#installation) and [Velociraptor](https://github.com/umbopepato/velociraptor#install).

- Configure `start.ts`, add/remove plugins, modify ports, rename .exe to .sh if you're on Linux.

- Start Saurus using Velociraptor.

```bash
vr start
```

