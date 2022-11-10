import Path from "path";
import FileSystem from "fs";
import { defineConfig } from "vite";
import monkeyPlugin, { type MonkeyUserScript } from "vite-plugin-monkey";

const entry = Path.join(__dirname, "src", "main.ts");
if (!FileSystem.existsSync(entry))
	throw new Error(`${entry} not found`);

const userscriptOptions: MonkeyUserScript = {
	name: "WeMeet On Time",
	version: "1.0.0",
	author: "true_mogician",
	namespace: "https://github.com/truemogician",
	description: "Allows you to join a WeMeet meeting at a specific time.",
	match: ["https://meeting.tencent.com/dm/*"],
	"run-at": "document-idle"
};

export default defineConfig({
	build: {
		outDir: Path.join(__dirname, "dist"),
		emptyOutDir: false,
		commonjsOptions: {
			include: []
		}
	},
	plugins: [
		monkeyPlugin({
			entry,
			userscript: userscriptOptions,
			format: {
				align: 4,
			},
			build: {
				fileName: `wemeet-on-time.user.js`
			}
		})
	]
});