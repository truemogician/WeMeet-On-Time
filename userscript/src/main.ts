interface MeetingInfo {
	code: number;

	hasPassword: boolean;

	startTime: Date;

	endTime: Date;
}

interface PageState {
	loggedIn: boolean;

	language: "English" | "简体中文";
}

interface Config {
	timingAdvance?: number;
}

function setImmediateInterval(handler: Function, timeout?: number, ...args: any[]) {
	handler();
	return window.setInterval(handler, timeout, ...args);
}

function joinMeeting(code: number) {
	const url = `wemeet://page/inmeeting?meeting_code=${code}&token=&meeting_type_flags=0&rs=58`;
	window.location.href = url;
}

function getPageState(root?: Document): PageState {
	root ??= document;
	const state: PageState = {
		loggedIn: document.getElementById("tm-header-avatar") != null,
		language: document.getElementById("language-text")!.textContent as any
	};
	return state;
}

function getMeetingInfo(root?: Document): MeetingInfo {
	root ??= document;
	const meeting = {
		code: Number.parseInt(root.getElementById("tm-meeting-code")!.textContent!.replace(/\s/g, "")),
		hasPassword: root.getElementById("passwordTip") != null
	} as MeetingInfo;
	const dateComponents = ["tm-meeting-start-time", "tm-meeting-start-date", "tm-meeting-end-time", "tm-meeting-end-date"]
		.map(id => root!.getElementById(id)!.textContent);
	const timezone = root.getElementById("tm-meeting-timezone")!.textContent;
	meeting.startTime = new Date(`${dateComponents[1]?.replace(/[年月日]/g, "/")} ${dateComponents[0]} ${timezone}`);
	meeting.endTime = new Date(`${dateComponents[3]?.replace(/[年月日]/g, "/")} ${dateComponents[2]} ${timezone}`);
	return meeting;
}

(function () {
	// Do nothing if the meeting has been canceled.
	const cancelBanner = document.getElementById("msgWrapCtrl");
	if (cancelBanner)
		return;
	const config = JSON.parse(localStorage.getItem("config") ?? "{}") as Config;
	const page = getPageState();
	const meeting = getMeetingInfo();
	const now = Date.now();
	if (meeting.startTime.getTime() <= now)
		return;
	const buttonsWrapper = document.getElementById("btnWrapCtrl")!;
	const buttonClasses = new Set(Array.from(document.querySelectorAll("#mpJoinBtnCtrl")).flatMap(e => Array.from(e.classList)));
	const joinLaterBtn = document.createElement("button");
	joinLaterBtn.id = "join-later-btn";
	joinLaterBtn.className = Array.from(buttonClasses).filter(n => /^join-button_(?:main|confirm)/.test(n)).join(" ");
	joinLaterBtn.textContent = page.language === "English" ? "Join On Time" : "准时入会";
	joinLaterBtn.addEventListener("click", e => {
		const self = e.currentTarget as HTMLButtonElement;
		const timerId = self.hasAttribute("data-timer-id") ? Number.parseInt(self.getAttribute("data-timer-id")!) : null;
		if (timerId != null) {
			clearInterval(timerId);
			self.removeAttribute("data-timer-id");
			self.textContent = page.language === "English" ? "Join On Time" : "准时入会";
		}
		else {
			const joinTime = new Date(meeting.startTime.getTime() - (config.timingAdvance ?? 0));
			if (joinTime.getTime() <= now)
				joinMeeting(meeting.code);
			else {
				const timer = setImmediateInterval(() => {
					const now = Date.now();
					let delay = joinTime.getTime() - now;
					if (delay <= 0) {
						clearInterval(timer);
						joinMeeting(meeting.code);
					}
					else {
						delay = Math.floor(delay / 1000);
						const components = new Array<number>(3);
						for (let i = 0; i < 3; i++) {
							components[2 - i] = delay % 60;
							delay = Math.floor(delay / 60);
						}
						const timeText = components.map(n => n.toString().padStart(2, "0")).join(":");
						self.textContent = page.language === "English" ? `Joining in ${timeText}` : `${timeText} 后入会`;
					}
				}, 1000);
				self.setAttribute("data-timer-id", timer.toString());
			}
		}
	});
	const btns = buttonsWrapper.querySelectorAll("button");
	btns[btns.length - 1].after(joinLaterBtn);
	setTimeout(() => joinLaterBtn.remove(), meeting.startTime.getTime() - now);
	const observer = new MutationObserver(records => {
		if (records.some(r => Array.from(r.removedNodes).includes(joinLaterBtn))) {
			if (meeting.startTime.getTime() <= now) {
				observer.disconnect();
				return;
			}
			console.warn("'Join On Time' button was externally removed");
			const btns = buttonsWrapper.querySelectorAll("button");
			btns[btns.length - 1].after(joinLaterBtn);
		}
	});
	observer.observe(buttonsWrapper, { childList: true, subtree: true });
})();