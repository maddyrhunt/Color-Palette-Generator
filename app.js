// JavaScript Document
alert("JS Loaded!");

var paletteEl = document.getElementById("palette");
var savedListEl = document.getElementById("savedList");
var toastEl = document.getElementById("toast");

var generateBtn = document.getElementById("generate");
var saveBtn = document.getElementById("save");
var copyCssBtn = document.getElementById("copyCss");
var exportPngBtn = document.getElementById("exportPng");

var exportCanvas = document.getElementById("exportCanvas");

var modeEl = document.getElementById("mode");
var baseControlsEl = document.getElementById("baseControls");
var baseColorEl = document.getElementById("baseColor");
var baseStyleEl = document.getElementById("baseStyle");
var paletteNameEl = document.getElementById("paletteName");

var showAllBtn = document.getElementById("showAll");
var showFavBtn = document.getElementById("showFav");

var swatches = 5;
var state = []; // {hex:"#AABBCC", locked:false }
var showFavOnly = false;

var STORAGE_KEY = "paletteGen_saved_v1";

/* ---------- Helpers ---------- */

function randomHex() {
	var chars = "0123456789ABCDEF";
	var hex = "#";
	for (var i = 0; i < 6; i++) {
		hex += chars[Math.floor(Math.random() * 16)];
	}
	return hex;
}

function showToast(message) {
	toastEl.textContent = message;
	toastEl.className = "toast show";
	setTimeout(function () {
		toastEl.className = "toast";
	}, 900);
}

function fallbackCopy(text) {
	var temp = document.createElement("textarea");
	temp.value = text;
	document.body.appendChild(temp);
	temp.select();
	document.execCommand("copy");
	document.body.removeChild(temp);
	showToast("Copied " + text);
}

function copyText(text) {
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(text).then(function () {
			showToast("Copied " + text);
		}).catch(function () {
			fallbackCopy(text);
		});
	} else {
		fallbackCopy(text);
	}
}

/* ---------- Base colour generation ---------- */

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}


function hexToRgb(hex) {
	var h =hex.replace("#", "");
	if (h.length === 3) {
		h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	}
	var r = parseInt(h.substring(0, 2), 16);
	var g = parseInt(h.substring(2, 4), 16);
	var b = parseInt(h.substring(4, 6), 16);
	return { r: r, g: g, b: b };
}


function rgbToHex(r, g, b) {
	function toHex(x) {
		var h = x.toString(16).toUpperCase();
		return h.length === 1 ? "0" + h : h;
	}
	return "#" + toHex(r) + toHex(g) + toHex(b);
}

function rgbToHsl(r, g, b) {
	r /= 255; g /=255; b /=255;
	
	var max = Math.max(r, g, b);
	var min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;
	
	if (max === min) {
		h = 0; s = 0;
	} else {
		var d = max - min;
		s =l > 0.5 ? d / (2 - max - min) : d / (max + min);
		
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return { h: h, s: s, l: l };
}

function hslToRgb(h, s, l) {
	var r, g, b;
	
	if (s === 0) {
		r = l; g = l; b = l;
	} else {
		function hue2rgb(p, q, t) {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1/6) return p + (q - p) * 6 * t;
			if (t < 1/2) return q;
			if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}
		
		var q = l < 0.5 ? l * (1 + s) : l + s -l * s;
		var p = 2 * l - q;
		
		r = hue2rgb(p, q, h + 1/3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1/3);
	}
	
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	};
}

function generateFromBase(baseHex, style) {
	var rgb = hexToRgb(baseHex);
	var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
	
	var steps = [-0.20, -0.10, 0, 0.10, 0.20];
	var out = [];
	
	for (var i = 0; i < steps.length; i++) {
		var h = hsl.h;
		var s = hsl.s;
		var l = hsl.l;
		
		if (style === "shades") {
			l = clamp(l + steps[i], 0.08, 0.92);
		} else {
			s = clamp(s + steps[i], 0.10, 0.95);
		}
		var rgb2 = hslToRgb(h, s, l);
		out.push(rgbToHex(rgb2.r, rgb2.g, rgb2.b));
	}
	
	return out;
}


/* ---------- State + render ---------- */

function ensureState() {
	if (state.length === 0) {
		for (var i = 0; i < swatches; i++) {
			state.push({ hex: randomHex(), locked: false });
		}
	}
}


function setPelette(hexes) {
	ensureState();
	for (var i = 0; i < state.length; i++) {
		if (!state[i].locked) state[i].hex = hexes[i];
	}
	render();
}


function generatePalette() {
	ensureState();
	
	if (modeEl.value === "base") {
		var hexes = generateFromBase(baseColorEl.value, baseStyleEl.value);
		setPelette(hexes);
		return;
	}
	
	for (var i = 0; i < state.length; i++) {
		if (!state[i].locked) state[i].hex = randomHex();
	}
	render();
}


function toggleLock(index) {
	state[index].locked = !state[index].locked;
	render();
}


function render() {
	paletteEl.innerHTML = "";
	
	for (var i =0; i < state.length; i++) {
		(function (index) {
			var swatch = document.createElement("div");
			swatch.className = "swatch" + (state[index].locked ? " locked" : "");
			
			var color = document.createElement("div");
			color.className = "color";
			color.style.background = state[index].hex;
			color.addEventListener("click", function () {
				copyText(state[index].hex);
			});
			
			var info = document.createElement("div");
			info.className = "info";
			
			var hex = document.createElement("div");
			hex.className = "hex";
			hex.textContent = state[index].hex;
			
			var lockBtn = document.createElement("button");
			lockBtn.className = "lock";
			lockBtn.type = "button";
			lockBtn.textContent = state[index].locked ? "Locked" : "Lock";
			lockBtn.addEventListener("clock", function () {
				toggleLock(index);
			});
			
			info.appendChild(hex);
			info.appendChild(lockBtn);
			
			swatch.appendChild(color);
			swatch.appendChild(index);
			
			paletteEl.appendChild(swatch);
		})(i);
	}
}

/* ---------- Save / favorites ---------- */

function loadSaved() {
	var raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) return [];
	try { return JSON.parse(raw) || []; }
	catch (e) { return []; }
}

function saveSaved(list) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}


function nowId() {
	return "p_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 10000))
}


function currentHexes() {
	var arr = [];
	for (var i = 0; i < state.length; i++) arr.push(state[i].hex);
	return arr;
}


function saveCurrentPalette() {
	var name = paletteNameEl.value.trim();
	if (!name) name = "Untitled Palette";
	
	var list = loadSaved();
	list.unshift({
		id: nowId(),
		name: name,
		hexes: currentHexes(),
		fav: false,
		createdAt: Date.now()
	});
	
	saveSaved(list);
	renderSaved();
	showToast("Saved: " + name);
}


function toggleFav(id) {
	var list = loadSaved();
	for (var i = 0; i < list.length; i++) {
		if (list[i].id === id) {
			list[i].fav = !list[i].fav;
			break;
		}
	}
	saveSaved(list);
	renderSaved();
}


function deleteSaved(id) {
	var list = loadSaved();
	var out = [];
	for (var i = 0; i < list.length; i++) {
		if (list[i].id !== id) out.push(list[i]);
	}
	saveSaved(out);
	renderSaved();
	showToast("Deleted palette");
}

function loadIntoMain(hexes) {
	for (var i = 0; i < state.length; i++) state[i].locked = false;
	setPelette(hexes);
	showToast("Loaded palette");
}

function formatDate(ts) {
	var d = new Date(ts);
	return d.toLocaleDateString();
}

function renderSaved() {
	var list = loadSaved();
	savedListEl.innerHTML = "";
	
	
	var filtered = [];
	for (var i = 0; i < list.length; i++) {
		if (!showFavOnly || list[i].fav) filtered.push(list[i]);
	}
	
	if (filtered.length === 0) {
		var empty = document.createElement("div");
		empty.className = "cardSaved";
		empty.textContent = showFavOnly ? "No favourites yet" : "No saved palettes yet - save one";
		savedListEl.appendChild(empty);
		return;
	}
	
	for (var j = 0; j < filtered.length; j++) {
		(function (item) {
			var card = document.createElement("div");
			card.className = "cardSaved";
			
			var top = document.createElement("div");
			top.className = "savedTop";
			
			var left = document.createElement("div");
			
			var title = document.createElement("div");
			title.className = "savedTitle";
			title.textContent = item.name + (item.fav ? " ★" : "");
			
			var meta = document.createElement("div");
			meta.className = "savedMeta";
			meta.textContent = formatDate(item.createdAt);
			
			left.appendChild(title);
			left.appendChild(meta);
			
			var btns = document.createElement("div");
			btns.className = "miniBtns";
			
			var favBtn = document.createElement("button");
			favBtn.className = "miniBtn";
			favBtn.type = "button";
			favBtn.textContent = item.fav ? "★" : "☆";
			favBtn.addEventListener("click", function () { toggleFav(item.id); });
			
			
			var loadBtn = document.createElement("button");
			loadBtn.className = "miniBtn";
			loadBtn.type = "button";
			loadBtn.textContent = "Load";
			loadBtn.addEventListener("click", function () { loadIntoMain(item.hexes); });
		
			var delBtn = document.createElement("button");
			delBtn.className = "miniBtn";
			delBtn.type = "button";
			delBtn.textContent = "Delete";
			delBtn.addEventListener("click", function () { deleteSaved(item.id); });
		
			
			btns.appendChild(favBtn);
			btns.appendChild(loadBtn);
			btns.appendChild(delBtn);
		
			
			top.appendChild(left);
			top.appendChild(btns);
		
		
			var preview = document.createElement("div");
			preview.className = "preview";
			for (var k = 0; k < item.hexes.length; k++) {
				var b = document.createElement("div");
				b.style.background = item.hexes[k];
				preview.appendChild(b);
			}
		
		
			card.appendChild(top);
			card.appendChild(preview);
			savedListEl.appendChild(card);
		}) (filtered[j]);
	}
}


/* ---------- Export ---------- */


function cssVarsText() {
	var hexes = currentHexes();
	var out = ":root {\n";
	for (var i = 0; i < hexes.length; i++) {
		out += " --color-" + (i + 1) + ": " + hexes[i] + ";\n";
	}
	out += "}\n";
	return out;
}


function exportPng() {
	var ctx = exportCanvas.getContext("2d");
	var w = exportCanvas.width;
	var h = exportCanvas.height;
	
	ctx.clearRect(0, 0, w, h);
	
	var hexes = currentHexes();
	var blockW = Math.floor(w / hexes.length);
	
	for (var i = 0; i < hexes.length; i++) {
		ctx.fillStyle = "rgba(0,0,0,0.35)";
		ctx.fillRect(i * blockW + 18, h - 62, blockW - 36, 44);
		
		
		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 24px system-ui, -apple-system, Segoe UI";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(hexes[i], i * blockW + blockW / 2, h - 40);
	}
	
	
	var name = (paletteNameEl.value.trim() || "palette")
		.replace(/[^a-z0-9\-_]+/gi, "_")
		.toLowerCase();
	
	
	var link = document.createElement("a");
	link.download = name + ".png";
	link.href = exportCanvas.toDataURL("image/png");
	link.click();
	
	showToast("Downloaded PNG");
}

function updateModeUI() {
	baseColorEl.style.display = (modeEl.value === "base") ? "block" : "none";
}

/* ---------- Events ----------*/


generateBtn.addEventListener("click", function() {
	generatePalette();
});

saveBtn.addEventListener("click", function () {
	saveCurrentPalette();
});

copyCssBtn.addEventListener("click", function () {
	copyText(cssVarsText());
});

exportPngBtn.addEventListener("click", function () {
	exportPng();
});

modeEl.addEventListener("change", function () {
	updateModeUI();
	generatePalette();
});

baseColorEl.addEventListener("input", function () {
	if (modeEl.value === "base") generatePalette();
});

baseStyleEl.addEventListener("change", function () {
	if (modeEl.value === "base") generatePalette();
});

showAllBtn.addEventListener("click", function () {
	showFavOnly = false;
	showAllBtn.className = "pill active";
	showFavBtn.className = "pill";
	renderSaved();
});

showFavBtn.addEventListener("click", function () {
	showFavOnly = true;
	showFavBtn.className = "pill active";
	showAllBtn.className = "pill";
	renderSaved;
});

document.addEventListener("keydown", function (e) {
	if (e.code === "Space") {
		e.preventDefault();
		generatePalette();
	}
});


/* ---------- Start ---------- */

ensureState();
updateModeUI();
generatePalette();
renderSaved();





































