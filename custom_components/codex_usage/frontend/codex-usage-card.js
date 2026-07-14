//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, re = f.trustedTypes, ie = re ? re.emptyScript : "", ae = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ie : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, oe = (e, t) => !l(e, t), se = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: oe
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var h = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = se) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? se;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(Infinity).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? oe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[p("elementProperties")] = /* @__PURE__ */ new Map(), h[p("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: h }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var g = globalThis, ce = (e) => e, _ = g.trustedTypes, le = _ ? _.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", v = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + v, fe = `<${de}>`, y = document, b = () => y.createComment(""), x = (e) => e === null || typeof e != "object" && typeof e != "function", S = Array.isArray, pe = (e) => S(e) || typeof e?.[Symbol.iterator] == "function", C = "[ 	\n\f\r]", w = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, he = />/g, T = RegExp(`>|${C}(?:([^\\s"'>=/]+)(${C}*=${C}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, _e = /"/g, ve = /^(?:script|style|textarea|title)$/i, E = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), D = Symbol.for("lit-noChange"), O = Symbol.for("lit-nothing"), ye = /* @__PURE__ */ new WeakMap(), k = y.createTreeWalker(y, 129);
function be(e, t) {
	if (!S(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var xe = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = w;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === w ? c[1] === "!--" ? o = me : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = T) : (ve.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = T) : o = he : o === T ? c[0] === ">" ? (o = i ?? w, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? T : c[3] === "\"" ? _e : ge) : o === _e || o === ge ? o = T : o === me || o === he ? o = w : (o = T, i = void 0);
		let d = o === T && e[t + 1].startsWith("/>") ? " " : "";
		a += o === w ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + ue + n.slice(l) + v + d) : n + v + (l === -2 ? t : d);
	}
	return [be(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, A = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = xe(t, n);
		if (this.el = e.createElement(l, r), k.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = k.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ue)) {
					let t = u[o++], n = i.getAttribute(e).split(v), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Ce : r[1] === "?" ? we : r[1] === "@" ? Te : N
					}), i.removeAttribute(e);
				} else e.startsWith(v) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ve.test(i.tagName)) {
					let e = i.textContent.split(v), t = e.length - 1;
					if (t > 0) {
						i.textContent = _ ? _.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], b()), k.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], b());
					}
				}
			} else if (i.nodeType === 8) if (i.data === de) c.push({
				type: 2,
				index: a
			});
			else {
				let e = -1;
				for (; (e = i.data.indexOf(v, e + 1)) !== -1;) c.push({
					type: 7,
					index: a
				}), e += v.length - 1;
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = y.createElement("template");
		return n.innerHTML = e, n;
	}
};
function j(e, t, n = e, r) {
	if (t === D) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = x(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = j(e, i._$AS(e, t.values), i, r)), t;
}
var Se = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? y).importNode(t, !0);
		k.currentNode = r;
		let i = k.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new M(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ee(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = k.nextNode(), a++);
		}
		return k.currentNode = y, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, M = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = O, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = j(this, e, t), x(e) ? e === O || e == null || e === "" ? (this._$AH !== O && this._$AR(), this._$AH = O) : e !== this._$AH && e !== D && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? pe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== O && x(this._$AH) ? this._$AA.nextSibling.data = e : this.T(y.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = A.createElement(be(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Se(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ye.get(e.strings);
		return t === void 0 && ye.set(e.strings, t = new A(e)), t;
	}
	k(t) {
		S(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(b()), this.O(b()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ce(e).nextSibling;
			ce(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, N = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = O, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = O;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = j(this, e, t, 0), a = !x(e) || e !== this._$AH && e !== D, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = j(this, r[n + o], t, o), s === D && (s = this._$AH[o]), a ||= !x(s) || s !== this._$AH[o], s === O ? e = O : e !== O && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === O ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Ce = class extends N {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === O ? void 0 : e;
	}
}, we = class extends N {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== O);
	}
}, Te = class extends N {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = j(this, e, t, 0) ?? O) === D) return;
		let n = this._$AH, r = e === O && n !== O || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== O && (n === O || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ee = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		j(this, e);
	}
}, De = g.litHtmlPolyfillSupport;
De?.(A, M), (g.litHtmlVersions ??= []).push("3.3.3");
var Oe = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new M(t.insertBefore(b(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, P = globalThis, F = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Oe(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return D;
	}
};
F._$litElement$ = !0, F.finalized = !0, P.litElementHydrateSupport?.({ LitElement: F });
var ke = P.litElementPolyfillSupport;
ke?.({ LitElement: F }), (P.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var Ae = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, je = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	hasChanged: oe
}, Me = (e = je, t, n) => {
	let { kind: r, metadata: i } = n, a = globalThis.litPropertyMetadata.get(i);
	if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), r === "setter" && ((e = Object.create(e)).wrapped = !0), a.set(n.name, e), r === "accessor") {
		let { name: r } = n;
		return {
			set(n) {
				let i = t.get.call(this);
				t.set.call(this, n), this.requestUpdate(r, i, e, !0, n);
			},
			init(t) {
				return t !== void 0 && this.C(r, void 0, e, t), t;
			}
		};
	}
	if (r === "setter") {
		let { name: r } = n;
		return function(n) {
			let i = this[r];
			t.call(this, n), this.requestUpdate(r, i, e, !0, n);
		};
	}
	throw Error("Unsupported decorator location: " + r);
};
function I(e) {
	return (t, n) => typeof n == "object" ? Me(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function L(e) {
	return I({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/card-data.ts
var Ne = [
	"spend",
	"credits",
	"usage_limit",
	"unknown",
	null
];
function R(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : null;
}
function z(e) {
	return typeof e == "string" && e.trim() ? e.trim() : null;
}
function B(e) {
	let t = z(e);
	return t && Number.isFinite(Date.parse(t)) ? t : null;
}
function V(e) {
	return typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 100 ? e : null;
}
function Pe(e) {
	return typeof e == "number" && Number.isFinite(e) ? e : null;
}
function H(e) {
	return typeof e == "boolean" ? e : null;
}
function Fe(e) {
	let t = z(e);
	return t && /^(sensor|binary_sensor)\.[a-z0-9_]+$/.test(t) ? t : null;
}
function Ie(e) {
	let t = R(e);
	if (!t) return null;
	let n = z(t.id), r = z(t.name);
	if (!n || !r || t.source !== "main" && t.source !== "additional") return null;
	let i = V(t.used_percent), a = V(t.remaining_percent);
	return i === null && a === null && H(t.reached) !== !0 ? null : {
		id: n,
		name: r,
		source: t.source,
		duration_seconds: typeof t.duration_seconds == "number" && Number.isFinite(t.duration_seconds) && t.duration_seconds > 0 ? t.duration_seconds : null,
		used_percent: i,
		remaining_percent: a,
		resets_at: B(t.resets_at),
		reached: t.reached === !0,
		entity_id: Fe(t.entity_id)
	};
}
function Le(e) {
	let t = R(e);
	return t ? {
		balance: z(t.balance),
		has_credits: H(t.has_credits),
		unlimited: H(t.unlimited),
		overage_reached: H(t.overage_reached)
	} : null;
}
function Re(e) {
	let t = R(e);
	return t ? {
		source: z(t.source),
		limit: z(t.limit),
		used: z(t.used),
		remaining: z(t.remaining),
		used_percent: V(t.used_percent),
		remaining_percent: V(t.remaining_percent),
		resets_at: B(t.resets_at),
		reached: H(t.reached)
	} : null;
}
function ze(e) {
	let t = R(e);
	if (!t) return null;
	let n = z(t.id), r = z(t.name);
	if (!n || !r || !Array.isArray(t.limits)) return null;
	let i = Ne.includes(t.blocker) ? t.blocker : "unknown", a = R(t.reset_credits), o = R(t.profile);
	return {
		id: n,
		name: r,
		plan: z(t.plan),
		available: t.available === !0,
		updated_at: B(t.updated_at),
		blocker: i,
		limits: t.limits.map(Ie).filter((e) => e !== null),
		credits: Le(t.credits),
		spend: Re(t.spend),
		reset_credits: a ? {
			available_count: Pe(a.available_count),
			total_earned: Pe(a.total_earned),
			next_expiry: B(a.next_expiry)
		} : null,
		profile: o ? Object.fromEntries(Object.entries(o).filter(([, e]) => e === null || typeof e == "string" || typeof e == "number" && Number.isFinite(e))) : null
	};
}
function Be(e) {
	let t = R(e);
	if (!t || t.schema_version !== 1 || !Array.isArray(t.accounts)) throw Error("Unsupported Codex Usage card data");
	let n = z(t.integration_version), r = B(t.generated_at);
	if (!n || !r) throw Error("Incomplete Codex Usage card data");
	return {
		schema_version: 1,
		integration_version: n,
		generated_at: r,
		accounts: t.accounts.map(ze).filter((e) => e !== null)
	};
}
async function Ve(e) {
	return Be(await e.callWS({ type: "codex_usage/card_data" }));
}
//#endregion
//#region src/config.ts
var He = [
	"auto",
	"single",
	"all"
], Ue = [
	"adaptive",
	"compact",
	"detailed"
], We = [
	"limits",
	"resets",
	"pace",
	"credits",
	"spending",
	"profile",
	"footer"
], Ge = [
	"missing",
	"stale",
	"normal",
	"elevated",
	"critical",
	"blocked"
], U = {
	elevated: 60,
	critical: 85
}, Ke = {
	normal: "var(--codex-usage-normal-color, #25b7f3)",
	elevated: "var(--codex-usage-elevated-color, #ffb74d)",
	critical: "var(--codex-usage-critical-color, #ff5f6d)",
	blocked: "var(--codex-usage-blocked-color, #d32f49)",
	stale: "var(--codex-usage-stale-color, #78909c)",
	missing: "var(--codex-usage-missing-color, #9e9e9e)"
}, W = (e = !0) => ({
	visible: e,
	values: {}
}), G = {
	type: "custom:codex-usage-card",
	account_mode: "auto",
	included_entry_ids: [],
	allow_account_switching: !0,
	display_mode: "adaptive",
	title: "Codex Usage",
	show_unavailable_limits: !1,
	sections: {
		limits: W(),
		resets: W(),
		pace: W(),
		credits: W(),
		spending: W(),
		profile: W(),
		footer: W()
	},
	thresholds: { ...U },
	colors: { ...Ke },
	stale_after_minutes: 15,
	appearance: {
		card_radius: 20,
		panel_radius: 14,
		spacing: 16
	}
};
function K(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function qe(e) {
	if (!K(e)) return {};
	try {
		return structuredClone(e);
	} catch {
		return {};
	}
}
function Je(e, t) {
	return typeof e == "string" && t.includes(e);
}
function Ye(e) {
	if (typeof e == "string") return e.trim() || void 0;
}
function Xe(e) {
	return Array.isArray(e) ? [...new Set(e.map(Ye).filter((e) => !!e))] : [];
}
function Ze(e) {
	let t = K(e) ? e : {};
	return Object.fromEntries(We.map((e) => {
		let n = K(t[e]) ? t[e] : {}, r = K(n.values) ? Object.fromEntries(Object.entries(n.values).filter(([, e]) => typeof e == "boolean")) : {};
		return [e, {
			visible: typeof n.visible == "boolean" ? n.visible : G.sections[e].visible,
			values: r
		}];
	}));
}
function Qe(e) {
	if (!K(e)) return { ...U };
	let t = e.elevated, n = e.critical;
	return typeof t == "number" && Number.isFinite(t) && typeof n == "number" && Number.isFinite(n) && t >= 0 && t < n && n <= 100 ? {
		elevated: t,
		critical: n
	} : { ...U };
}
function $e(e) {
	if (typeof e != "string" || !e.trim()) return !1;
	if (typeof CSS > "u" || typeof CSS.supports != "function") return !0;
	try {
		return CSS.supports("color", e);
	} catch {
		return !1;
	}
}
function et(e) {
	let t = K(e) ? e : {};
	return Object.fromEntries(Ge.map((e) => [e, $e(t[e]) ? t[e].trim() : Ke[e]]));
}
function q(e, t, n, r) {
	return typeof e == "number" && Number.isFinite(e) && e >= n && e <= r ? e : t;
}
function tt(e) {
	let t = K(e) ? e : {};
	return {
		card_radius: q(t.card_radius, G.appearance.card_radius, 0, 48),
		panel_radius: q(t.panel_radius, G.appearance.panel_radius, 0, 36),
		spacing: q(t.spacing, G.appearance.spacing, 4, 32)
	};
}
function J(e) {
	let t = qe(e), n = {
		type: typeof t.type == "string" ? t.type : G.type,
		account_mode: Je(t.account_mode, He) ? t.account_mode : G.account_mode,
		included_entry_ids: Xe(t.included_entry_ids),
		allow_account_switching: typeof t.allow_account_switching == "boolean" ? t.allow_account_switching : G.allow_account_switching,
		display_mode: Je(t.display_mode, Ue) ? t.display_mode : G.display_mode,
		title: typeof t.title == "string" ? t.title : G.title,
		show_unavailable_limits: typeof t.show_unavailable_limits == "boolean" ? t.show_unavailable_limits : G.show_unavailable_limits,
		sections: Ze(t.sections),
		thresholds: Qe(t.thresholds),
		colors: et(t.colors),
		stale_after_minutes: typeof t.stale_after_minutes == "number" && Number.isFinite(t.stale_after_minutes) && t.stale_after_minutes >= 5 && t.stale_after_minutes <= 1440 ? t.stale_after_minutes : G.stale_after_minutes,
		appearance: tt(t.appearance)
	}, r = Ye(t.selected_entry_id);
	r && (n.selected_entry_id = r);
	for (let e of [
		"view_layout",
		"layout_options",
		"grid_options"
	]) K(t[e]) && (n[e] = t[e]);
	return Array.isArray(t.visibility) && (n.visibility = structuredClone(t.visibility)), n;
}
//#endregion
//#region src/localize.ts
var nt = {
	en: {
		available: "Available",
		blocked: "Blocked",
		stale: "Out of date",
		unavailable: "Unavailable",
		remaining: "remaining",
		resets: "Resets",
		pace: "Pace",
		ahead: "ahead of time",
		behind: "below time",
		credits: "Credits",
		spending: "Spending",
		profile: "Profile",
		noData: "No usage data reported",
		updated: "Updated",
		account: "Account",
		allAccounts: "All accounts",
		unknownWindow: "Usage window",
		fiveHours: "5 hours",
		week: "Week",
		days: "days",
		sections: "Sections",
		advanced: "Advanced",
		documentation: "Documentation",
		thresholds: "Thresholds",
		tokens: "Tokens",
		threads: "Threads",
		cardTitle: "Title",
		displayMode: "Display mode",
		accountMode: "Account mode",
		selectedAccount: "Fixed account",
		accountSwitching: "Allow account switching",
		showUnavailable: "Show unavailable limits",
		appearance: "Appearance",
		resetDefaults: "Reset to defaults",
		sectionLimits: "Limits",
		sectionResets: "Reset times",
		sectionPace: "Pace",
		sectionCredits: "Credits",
		sectionSpending: "Spending",
		sectionProfile: "Profile",
		sectionFooter: "Footer"
	},
	de: {
		available: "Verfügbar",
		blocked: "Blockiert",
		stale: "Veraltet",
		unavailable: "Nicht verfügbar",
		remaining: "verbleibend",
		resets: "Zurücksetzung",
		pace: "Tempo",
		ahead: "über Zeitfortschritt",
		behind: "unter Zeitfortschritt",
		credits: "Guthaben",
		spending: "Ausgaben",
		profile: "Profil",
		noData: "Keine Nutzungsdaten gemeldet",
		updated: "Aktualisiert",
		account: "Konto",
		allAccounts: "Alle Konten",
		unknownWindow: "Nutzungsfenster",
		fiveHours: "5 Stunden",
		week: "Woche",
		days: "Tage",
		sections: "Bereiche",
		advanced: "Erweitert",
		documentation: "Dokumentation",
		thresholds: "Schwellenwerte",
		tokens: "Token",
		threads: "Unterhaltungen",
		cardTitle: "Titel",
		displayMode: "Anzeigemodus",
		accountMode: "Kontomodus",
		selectedAccount: "Festes Konto",
		accountSwitching: "Kontowechsel erlauben",
		showUnavailable: "Nicht verfügbare Limits anzeigen",
		appearance: "Darstellung",
		resetDefaults: "Auf Standard zurücksetzen",
		sectionLimits: "Limits",
		sectionResets: "Zurücksetzungen",
		sectionPace: "Tempo",
		sectionCredits: "Guthaben",
		sectionSpending: "Ausgaben",
		sectionProfile: "Profil",
		sectionFooter: "Fußzeile"
	}
};
function rt(e, t) {
	return nt[e?.toLowerCase().startsWith("de") ? "de" : "en"][t];
}
//#endregion
//#region src/status.ts
var it = {
	missing: 0,
	normal: 1,
	stale: 2,
	elevated: 3,
	critical: 4,
	blocked: 5
};
function at(e, t, n) {
	return t ? "blocked" : typeof e != "number" || !Number.isFinite(e) ? "missing" : e >= n.critical ? "critical" : e >= n.elevated ? "elevated" : "normal";
}
function ot(e) {
	return e.reduce((e, t) => it[t] > it[e] ? t : e, "missing");
}
//#endregion
//#region src/view-model.ts
function Y(e) {
	if (!e) return null;
	let t = new Date(e);
	return Number.isFinite(t.getTime()) ? t : null;
}
function st(e, t, n) {
	let r = Y(e);
	return r === null || n.getTime() - r.getTime() > t * 6e4;
}
function ct(e, t) {
	if (!e.duration_seconds || !e.resets_at || e.used_percent === null) return null;
	let n = Y(e.resets_at);
	if (!n) return null;
	let r = n.getTime() - e.duration_seconds * 1e3, i = (t.getTime() - r) / (e.duration_seconds * 1e3) * 100;
	return !Number.isFinite(i) || i < 0 || i > 110 ? null : e.used_percent - Math.min(100, i);
}
function lt(e, t, n) {
	let r = !e.available || st(e.updated_at, t.stale_after_minutes, n), i = e.limits.map((r) => ({
		...r,
		severity: at(r.used_percent, r.reached || e.blocker !== null, t.thresholds),
		pace: ct(r, n)
	})), a = e.blocker === null ? ot(i.map((e) => e.severity)) : "blocked";
	return e.blocker === null && r && a !== "missing" && (a = "stale"), {
		...e,
		limits: i,
		severity: a,
		stale: r
	};
}
function ut(e, t, n, r = /* @__PURE__ */ new Date()) {
	let i = e.accounts;
	t.included_entry_ids.length > 0 && (i = i.filter((e) => t.included_entry_ids.includes(e.id)));
	let a = i.map((e) => lt(e, t, r)), o = n ?? t.selected_entry_id, s = o ? a.find((e) => e.id === o) ?? null : null;
	return s ||= t.account_mode === "single" ? a[0] ?? null : [...a].sort((e, t) => [
		"missing",
		"normal",
		"stale",
		"elevated",
		"critical",
		"blocked"
	].indexOf(t.severity) - [
		"missing",
		"normal",
		"stale",
		"elevated",
		"critical",
		"blocked"
	].indexOf(e.severity))[0] ?? null, {
		accounts: a,
		selectedAccount: s,
		severity: t.account_mode === "single" && s ? s.severity : ot(a.map((e) => e.severity)),
		generatedAt: Y(e.generated_at),
		integrationVersion: e.integration_version
	};
}
//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/decorate.js
function X(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/codex-usage-card.ts
var dt = "codex_usage_card_data_updated", ft = "https://github.com/lucasscoded/Codex-Usage#dashboard-card";
function Z(e) {
	return e === null ? "—" : `${new Intl.NumberFormat(void 0, { maximumFractionDigits: 1 }).format(e)}%`;
}
var Q = class extends F {
	#e = void 0;
	get hass() {
		return this.#e;
	}
	set hass(e) {
		this.#e = e;
	}
	#t = void 0;
	get snapshot() {
		return this.#t;
	}
	set snapshot(e) {
		this.#t = e;
	}
	#n = !1;
	get error() {
		return this.#n;
	}
	set error(e) {
		this.#n = e;
	}
	#r = void 0;
	get sessionEntryId() {
		return this.#r;
	}
	set sessionEntryId(e) {
		this.#r = e;
	}
	config = structuredClone(G);
	unsubscribe;
	subscribedConnection;
	loading = !1;
	static getStubConfig() {
		return {};
	}
	static async getConfigElement() {
		return document.createElement("codex-usage-card-editor");
	}
	setConfig(e) {
		if (e.type !== "custom:codex-usage-card") throw Error("Invalid card type");
		this.config = J(e), this.sessionEntryId = void 0, this.requestUpdate();
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 3,
			max_columns: 12
		};
	}
	getCardSize() {
		return this.config.display_mode === "compact" ? 3 : 5;
	}
	updated(e) {
		e.has("hass") && this.hass && this.startClient();
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0, this.subscribedConnection = void 0;
	}
	async startClient() {
		if (!this.hass) return;
		let e = this.subscribedConnection !== this.hass.connection || !this.snapshot;
		this.subscribedConnection !== this.hass.connection && (this.unsubscribe?.(), this.subscribedConnection = this.hass.connection, this.unsubscribe = await this.hass.connection.subscribeEvents(() => void this.loadSnapshot(), dt)), e && await this.loadSnapshot();
	}
	async loadSnapshot() {
		if (!(!this.hass || this.loading)) {
			this.loading = !0;
			try {
				this.snapshot = await Ve(this.hass), this.error = !1;
			} catch {
				this.error = !0;
			} finally {
				this.loading = !1;
			}
		}
	}
	t(e) {
		return rt(this.hass?.locale?.language ?? this.hass?.language, e);
	}
	statusLabel(e) {
		return e === "blocked" ? this.t("blocked") : e === "stale" ? this.t("stale") : e === "missing" ? this.t("unavailable") : this.t("available");
	}
	limitLabel(e) {
		return e.duration_seconds === 18e3 ? this.t("fiveHours") : e.duration_seconds === 604800 ? this.t("week") : e.duration_seconds && e.duration_seconds % 86400 == 0 ? `${e.duration_seconds / 86400} ${this.t("days")}` : e.name || this.t("unknownWindow");
	}
	resetLabel(e) {
		if (!e) return "—";
		let t = new Date(e);
		return Number.isFinite(t.getTime()) ? new Intl.DateTimeFormat(this.hass?.locale?.language ?? this.hass?.language, {
			weekday: "short",
			day: "2-digit",
			month: "2-digit",
			hour: "2-digit",
			minute: "2-digit"
		}).format(t) : "—";
	}
	openMoreInfo(e) {
		e && this.dispatchEvent(new CustomEvent("hass-more-info", {
			detail: { entityId: e },
			bubbles: !0,
			composed: !0
		}));
	}
	renderLimit(e, t) {
		let n = e.used_percent ?? (e.remaining_percent === null ? null : 100 - e.remaining_percent), r = e.remaining_percent ?? (n === null ? null : 100 - n), i = E` <div class="limit-head">
        <span>${this.limitLabel(e)}</span>
        ${this.config.sections.resets.visible && e.resets_at ? E`<span class="reset"
                >${this.t("resets")}: ${this.resetLabel(e.resets_at)}</span
              >` : O}
      </div>
      <div class="limit-content">
        ${t ? E`<div class="ring" style=${`--progress:${n ?? 0}`} aria-hidden="true">
                <strong>${Z(n)}</strong>
              </div>` : E`<strong class="limit-value">${Z(n)}</strong>`}
        <div class="limit-copy">
          <strong>${Z(r)} ${this.t("remaining")}</strong>
          <div
            class="bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow=${n ?? 0}
          >
            <span style=${`width:${n ?? 0}%`}></span>
          </div>
          ${this.config.sections.pace.visible && e.pace !== null ? E`<small
                  >${this.t("pace")}: ${Math.abs(e.pace).toFixed(1)}%
                  ${e.pace >= 0 ? this.t("ahead") : this.t("behind")}</small
                >` : O}
        </div>
      </div>`;
		return e.entity_id ? E`<button class="limit-panel panel" @click=${() => this.openMoreInfo(e.entity_id)}>
          ${i}
        </button>` : E`<div class="limit-panel panel">${i}</div>`;
	}
	renderDetails(e) {
		if (this.config.display_mode === "compact") return O;
		let t = [];
		if (this.config.sections.credits.visible && e.credits && t.push(E`<div class="detail panel">
          <span>${this.t("credits")}</span
          ><strong>${e.credits.unlimited ? "∞" : e.credits.balance ?? "—"}</strong>
        </div>`), this.config.sections.spending.visible && e.spend && t.push(E`<div class="detail panel">
          <span>${this.t("spending")}</span
          ><strong>${e.spend.remaining ?? e.spend.limit ?? "—"}</strong>
        </div>`), this.config.sections.profile.visible && e.profile) {
			let n = e.profile.lifetime_tokens, r = e.profile.total_threads;
			t.push(E`<div class="detail profile panel">
          <span>${this.t("profile")}</span
          ><strong
            >${typeof n == "number" ? new Intl.NumberFormat().format(n) : "—"}</strong
          ><small>${this.t("tokens")} · ${r ?? "—"} ${this.t("threads")}</small>
        </div>`);
		}
		return t.length ? E`<div class="details">${t}</div>` : O;
	}
	render() {
		let e = this.snapshot ? ut(this.snapshot, this.config, this.sessionEntryId) : null, t = e?.selectedAccount ?? null, n = e?.severity ?? "missing", r = t?.limits.filter((e) => this.config.sections.limits.values[e.id] !== !1 && (this.config.show_unavailable_limits || e.used_percent !== null || e.remaining_percent !== null)) ?? [];
		return E`<ha-card class=${n} style=${`--state-color:${this.config.colors[n]};--card-radius:${this.config.appearance.card_radius}px;--panel-radius:${this.config.appearance.panel_radius}px;--card-spacing:${this.config.appearance.spacing}px`}>
      <div class="surface">
        <header>
          <div>
            <h2>${this.config.title}</h2>
            <p>${t ? `${t.name}${t.plan ? ` · ${t.plan}` : ""}` : ""}</p>
          </div>
          <span class="status"><i></i>${this.statusLabel(n)}</span>
        </header>
        ${e && e.accounts.length > 1 && this.config.allow_account_switching ? E`<nav aria-label=${this.t("account")}>
                ${e.accounts.map((e) => E`<button
                      class="account-chip ${e.id === t?.id ? "selected" : ""}"
                      data-entry-id=${e.id}
                      @click=${() => this.sessionEntryId = e.id}
                    >
                      <i style=${`--chip-color:${this.config.colors[e.severity]}`}></i
                      >${e.name}
                    </button>`)}
              </nav>` : O}
        ${t && r.length && this.config.sections.limits.visible ? E`<main class="limits">
                ${r.map((e, t) => this.renderLimit(e, t === 0))}
              </main>` : E`<div class="empty">
                ${this.error ? this.t("unavailable") : this.t("noData")}
              </div>`}
        ${t ? this.renderDetails(t) : O}
        ${t && this.config.sections.footer.visible ? E`<footer>
                <span>${this.t("updated")}: ${this.resetLabel(t.updated_at)}</span
                ><span>v${e?.integrationVersion}</span>
              </footer>` : O}
      </div>
    </ha-card>`;
	}
	static styles = o`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    ha-card {
      display: block;
      --state-color: var(--codex-usage-normal-color, #25b7f3);
      position: relative;
      overflow: hidden;
      border-radius: var(--codex-usage-card-radius, var(--card-radius));
      border: 1px solid color-mix(in srgb, var(--state-color) 62%, transparent);
      background: linear-gradient(
        145deg,
        color-mix(
          in srgb,
          var(--state-color) 13%,
          var(--ha-card-background, var(--card-background-color))
        ),
        var(--ha-card-background, var(--card-background-color)) 42%
      );
      box-shadow:
        0 16px 38px rgba(0, 0, 0, 0.18),
        inset 0 1px color-mix(in srgb, var(--state-color) 28%, transparent);
      transition:
        border-color 0.25s ease,
        background 0.25s ease;
    }
    ha-card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--state-color);
      box-shadow: 0 0 24px var(--state-color);
      opacity: 0.85;
    }
    .surface {
      padding: var(--codex-usage-spacing, var(--card-spacing));
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
    }
    h2 {
      margin: 0;
      font-size: 1.28rem;
      letter-spacing: -0.025em;
    }
    p {
      margin: 3px 0 0;
      color: var(--secondary-text-color);
      font-size: 0.82rem;
      text-transform: capitalize;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid color-mix(in srgb, var(--state-color) 64%, transparent);
      background: color-mix(in srgb, var(--state-color) 13%, transparent);
      color: var(--state-color);
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .status i,
    nav i {
      width: 7px;
      height: 7px;
      background: currentColor;
      border-radius: 50%;
    }
    nav {
      display: flex;
      gap: 7px;
      overflow-x: auto;
      margin: 0 0 12px;
      scrollbar-width: none;
    }
    button {
      font: inherit;
      color: inherit;
    }
    .account-chip {
      border: 1px solid var(--divider-color);
      background: color-mix(in srgb, var(--primary-background-color) 35%, transparent);
      border-radius: 999px;
      padding: 6px 10px;
      display: flex;
      gap: 6px;
      align-items: center;
      cursor: pointer;
    }
    .account-chip i {
      background: var(--chip-color);
    }
    .account-chip.selected {
      border-color: var(--state-color);
      background: color-mix(in srgb, var(--state-color) 14%, transparent);
    }
    .limits {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
      gap: var(--codex-usage-spacing, var(--card-spacing));
    }
    .panel {
      border: 1px solid color-mix(in srgb, var(--divider-color) 75%, transparent);
      border-radius: var(--codex-usage-panel-radius, var(--panel-radius));
      background: color-mix(in srgb, var(--secondary-background-color) 72%, transparent);
    }
    .limit-panel {
      padding: 15px;
      min-width: 0;
      text-align: left;
    }
    button.limit-panel {
      cursor: pointer;
      width: 100%;
    }
    .limit-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.68rem;
      color: var(--secondary-text-color);
    }
    .reset {
      text-transform: none;
      font-weight: 500;
    }
    .limit-content {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 13px;
    }
    .ring {
      --progress: 0;
      width: 70px;
      height: 70px;
      flex: 0 0 70px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background:
        radial-gradient(
          circle,
          var(--ha-card-background, var(--card-background-color)) 57%,
          transparent 59%
        ),
        conic-gradient(
          var(--state-color) calc(var(--progress) * 1%),
          color-mix(in srgb, var(--divider-color) 65%, transparent) 0
        );
    }
    .ring strong {
      font-size: 1.15rem;
    }
    .limit-value {
      font-size: 1.45rem;
      min-width: 60px;
    }
    .limit-copy {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: 7px;
    }
    .bar {
      height: 6px;
      overflow: hidden;
      border-radius: 99px;
      background: color-mix(in srgb, var(--divider-color) 65%, transparent);
    }
    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--state-color);
    }
    small,
    footer {
      color: var(--secondary-text-color);
      font-size: 0.72rem;
    }
    .details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .detail {
      padding: 12px;
      display: grid;
      gap: 3px;
    }
    .detail span {
      color: var(--secondary-text-color);
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    .detail strong {
      font-size: 1rem;
    }
    footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 13px;
      padding: 0 2px;
    }
    .empty {
      padding: 30px 14px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    button:focus-visible {
      outline: 2px solid var(--state-color);
      outline-offset: 2px;
    }
    @media (max-width: 479px) {
      .surface {
        padding: 14px;
      }
      .limit-head {
        display: grid;
      }
      .reset {
        font-size: 0.65rem;
      }
      .ring {
        width: 62px;
        height: 62px;
        flex-basis: 62px;
      }
      footer {
        display: grid;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      ha-card {
        transition: none;
      }
    }
  `;
};
X([I({ attribute: !1 })], Q.prototype, "hass", null), X([L()], Q.prototype, "snapshot", null), X([L()], Q.prototype, "error", null), X([L()], Q.prototype, "sessionEntryId", null), Q = X([Ae("codex-usage-card")], Q);
var $ = class extends F {
	#e = void 0;
	get hass() {
		return this.#e;
	}
	set hass(e) {
		this.#e = e;
	}
	#t = structuredClone(G);
	get config() {
		return this.#t;
	}
	set config(e) {
		this.#t = e;
	}
	#n = [];
	get accounts() {
		return this.#n;
	}
	set accounts(e) {
		this.#n = e;
	}
	loadedConnection;
	handleValueChanged = (e) => {
		if (!(e instanceof CustomEvent) || !e.detail?.value) return;
		e.stopPropagation();
		let t = J({
			...this.config,
			...structuredClone(e.detail.value)
		});
		this.emitConfig(t);
	};
	emitConfig(e) {
		this.config = e, this.dispatchEvent(new CustomEvent("config-changed", {
			detail: { config: structuredClone(e) },
			bubbles: !0,
			composed: !0
		}));
	}
	connectedCallback() {
		super.connectedCallback(), this.addEventListener("value-changed", this.handleValueChanged);
	}
	disconnectedCallback() {
		this.removeEventListener("value-changed", this.handleValueChanged), super.disconnectedCallback();
	}
	setConfig(e) {
		this.config = J(e);
	}
	updated(e) {
		!e.has("hass") || !this.hass || this.loadedConnection === this.hass.connection || (this.loadedConnection = this.hass.connection, Ve(this.hass).then((e) => {
			this.accounts = e.accounts;
		}).catch(() => {
			this.accounts = [];
		}));
	}
	t(e) {
		return rt(this.hass?.locale?.language ?? this.hass?.language, e);
	}
	toggleSection(e) {
		let t = structuredClone(this.config);
		t.sections[e].visible = !t.sections[e].visible, this.emitConfig(t);
	}
	sectionLabel(e) {
		return this.t({
			limits: "sectionLimits",
			resets: "sectionResets",
			pace: "sectionPace",
			credits: "sectionCredits",
			spending: "sectionSpending",
			profile: "sectionProfile",
			footer: "sectionFooter"
		}[e]);
	}
	updateThresholds(e) {
		e.stopPropagation(), this.emitConfig(J({
			...this.config,
			thresholds: e.detail.value
		}));
	}
	updateAppearance(e) {
		e.stopPropagation(), this.emitConfig(J({
			...this.config,
			appearance: e.detail.value
		}));
	}
	resetAdvanced() {
		this.emitConfig(J({
			...this.config,
			thresholds: G.thresholds,
			stale_after_minutes: G.stale_after_minutes,
			appearance: G.appearance
		}));
	}
	render() {
		let e = [
			{
				name: "title",
				label: this.t("cardTitle"),
				selector: { text: {} }
			},
			{
				name: "display_mode",
				label: this.t("displayMode"),
				selector: { select: {
					mode: "dropdown",
					options: [
						"adaptive",
						"compact",
						"detailed"
					]
				} }
			},
			{
				name: "account_mode",
				label: this.t("accountMode"),
				selector: { select: {
					mode: "dropdown",
					options: [
						"auto",
						"single",
						"all"
					]
				} }
			},
			...this.config.account_mode === "single" ? [{
				name: "selected_entry_id",
				label: this.t("selectedAccount"),
				selector: { select: {
					mode: "dropdown",
					options: this.accounts.map((e) => ({
						value: e.id,
						label: e.name
					}))
				} }
			}] : [],
			{
				name: "allow_account_switching",
				label: this.t("accountSwitching"),
				selector: { boolean: {} }
			},
			{
				name: "show_unavailable_limits",
				label: this.t("showUnavailable"),
				selector: { boolean: {} }
			}
		];
		return E`<div class="editor">
      <ha-form .hass=${this.hass} .data=${this.config} .schema=${e}></ha-form>
      <details open>
        <summary>${this.t("sections")}</summary>
        <div class="toggles">
          ${We.map((e) => E`<label><input type="checkbox" .checked=${this.config.sections[e].visible} @change=${() => this.toggleSection(e)} />${this.sectionLabel(e)}</label>`)}
        </div>
      </details>
      <details>
        <summary>${this.t("advanced")}</summary>
        <h4>${this.t("thresholds")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.thresholds}
          .schema=${[{
			name: "elevated",
			selector: { number: {
				min: 0,
				max: 99,
				mode: "slider"
			} }
		}, {
			name: "critical",
			selector: { number: {
				min: 1,
				max: 100,
				mode: "slider"
			} }
		}]}
          @value-changed=${this.updateThresholds}
        ></ha-form>
        <h4>${this.t("appearance")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.appearance}
          .schema=${[
			{
				name: "card_radius",
				selector: { number: {
					min: 0,
					max: 48,
					mode: "box"
				} }
			},
			{
				name: "panel_radius",
				selector: { number: {
					min: 0,
					max: 36,
					mode: "box"
				} }
			},
			{
				name: "spacing",
				selector: { number: {
					min: 4,
					max: 32,
					mode: "box"
				} }
			}
		]}
          @value-changed=${this.updateAppearance}
        ></ha-form>
        <button class="reset-button" @click=${this.resetAdvanced}>
          ${this.t("resetDefaults")}
        </button>
        <p><a href=${ft} target="_blank" rel="noreferrer">${this.t("documentation")}</a></p>
      </details>
    </div>`;
	}
	static styles = o`
    .editor {
      display: grid;
      gap: 16px;
    }
    details {
      border-top: 1px solid var(--divider-color);
      padding-top: 10px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .toggles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    label {
      display: flex;
      gap: 8px;
      align-items: center;
      text-transform: capitalize;
    }
    p {
      color: var(--secondary-text-color);
    }
    a {
      color: var(--primary-color);
    }
    h4 {
      margin-bottom: 4px;
    }
    .reset-button {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 12px;
      background: transparent;
      color: var(--primary-text-color);
      cursor: pointer;
    }
  `;
};
X([I({ attribute: !1 })], $.prototype, "hass", null), X([L()], $.prototype, "config", null), X([L()], $.prototype, "accounts", null), $ = X([Ae("codex-usage-card-editor")], $);
//#endregion
//#region src/index.ts
var pt = {
	type: "codex-usage-card",
	name: "Codex Usage Card",
	description: "Adaptive multi-account Codex usage overview.",
	preview: !0,
	documentationURL: "https://github.com/lucasscoded/Codex-Usage#dashboard-card"
};
window.customCards ??= [], window.customCards.some((e) => e.type === pt.type) || window.customCards.push(pt);
//#endregion
