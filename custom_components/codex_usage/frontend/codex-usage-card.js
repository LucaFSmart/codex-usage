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
}, h = (e, t) => !l(e, t), oe = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: h
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = oe) {
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
		return this.elementProperties.get(e) ?? oe;
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
			let n = new Set(e.flat(1 / 0).reverse());
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
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? h)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
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
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[p("elementProperties")] = /* @__PURE__ */ new Map(), g[p("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: g }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var se = globalThis, ce = (e) => e, _ = se.trustedTypes, le = _ ? _.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", v = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + v, fe = `<${de}>`, y = document, b = () => y.createComment(""), x = (e) => e === null || typeof e != "object" && typeof e != "function", pe = Array.isArray, me = (e) => pe(e) || typeof e?.[Symbol.iterator] == "function", he = "[ 	\n\f\r]", S = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ge = /-->/g, _e = />/g, C = RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ve = /'/g, ye = /"/g, be = /^(?:script|style|textarea|title)$/i, w = ((e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}))(1), T = Symbol.for("lit-noChange"), E = Symbol.for("lit-nothing"), xe = /* @__PURE__ */ new WeakMap(), D = y.createTreeWalker(y, 129);
function Se(e, t) {
	if (!pe(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var Ce = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = S;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === S ? c[1] === "!--" ? o = ge : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = C) : (be.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = C) : o = _e : o === C ? c[0] === ">" ? (o = i ?? S, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? C : c[3] === "\"" ? ye : ve) : o === ye || o === ve ? o = C : o === ge || o === _e ? o = S : (o = C, i = void 0);
		let d = o === C && e[t + 1].startsWith("/>") ? " " : "";
		a += o === S ? n + fe : l >= 0 ? (r.push(s), n.slice(0, l) + ue + n.slice(l) + v + d) : n + v + (l === -2 ? t : d);
	}
	return [Se(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, we = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = Ce(t, n);
		if (this.el = e.createElement(l, r), D.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = D.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(ue)) {
					let t = u[o++], n = i.getAttribute(e).split(v), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? De : r[1] === "?" ? Oe : r[1] === "@" ? ke : k
					}), i.removeAttribute(e);
				} else e.startsWith(v) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (be.test(i.tagName)) {
					let e = i.textContent.split(v), t = e.length - 1;
					if (t > 0) {
						i.textContent = _ ? _.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], b()), D.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], b());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === de) c.push({
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
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = y.createElement("template");
		return n.innerHTML = e, n;
	}
};
function O(e, t, n = e, r) {
	if (t === T) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = x(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = O(e, i._$AS(e, t.values), i, r)), t;
}
var Te = class {
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
		D.currentNode = r;
		let i = D.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new Ee(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Ae(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = D.nextNode(), a++);
		}
		return D.currentNode = y, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, Ee = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = E, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
		e = O(this, e, t), x(e) ? e === E || e == null || e === "" ? (this._$AH !== E && this._$AR(), this._$AH = E) : e !== this._$AH && e !== T && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? me(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== E && x(this._$AH) ? this._$AA.nextSibling.data = e : this.T(y.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = we.createElement(Se(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new Te(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = xe.get(e.strings);
		return t === void 0 && xe.set(e.strings, t = new we(e)), t;
	}
	k(t) {
		pe(this._$AH) || (this._$AH = [], this._$AR());
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
}, k = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = E, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = E;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = O(this, e, t, 0), a = !x(e) || e !== this._$AH && e !== T, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = O(this, r[n + o], t, o), s === T && (s = this._$AH[o]), a ||= !x(s) || s !== this._$AH[o], s === E ? e = E : e !== E && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === E ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, De = class extends k {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === E ? void 0 : e;
	}
}, Oe = class extends k {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== E);
	}
}, ke = class extends k {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = O(this, e, t, 0) ?? E) === T) return;
		let n = this._$AH, r = e === E && n !== E || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== E && (n === E || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Ae = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		O(this, e);
	}
}, je = se.litHtmlPolyfillSupport;
je?.(we, Ee), (se.litHtmlVersions ??= []).push("3.3.3");
var Me = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new Ee(t.insertBefore(b(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, A = globalThis, j = class extends g {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Me(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return T;
	}
};
j._$litElement$ = !0, j.finalized = !0, A.litElementHydrateSupport?.({ LitElement: j });
var Ne = A.litElementPolyfillSupport;
Ne?.({ LitElement: j }), (A.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var Pe = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, Fe = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	hasChanged: h
}, Ie = (e = Fe, t, n) => {
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
function M(e) {
	return (t, n) => typeof n == "object" ? Ie(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function N(e) {
	return M({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/card-data.ts
var Le = [
	"usage",
	"profile",
	"reset_details",
	"workspace_discovery"
], Re = [
	"ok",
	"error",
	"unsupported",
	"disabled",
	"never"
], ze = [
	"rate_limited",
	"connection",
	"authentication",
	"invalid_response",
	"http_error"
], Be = [
	"spend",
	"credits",
	"usage_limit",
	"additional_limit",
	"unknown",
	"none"
], Ve = [
	"spend",
	"credits",
	"usage_limit",
	"unknown",
	null
], He = [
	"lifetime_tokens",
	"peak_daily_tokens",
	"current_streak_days",
	"longest_streak_days",
	"total_threads",
	"longest_running_turn_sec",
	"fast_mode_usage_percentage",
	"total_skills_used",
	"unique_skills_used",
	"most_used_reasoning_effort",
	"most_used_reasoning_effort_percentage"
], Ue = /* @__PURE__ */ new Set(["fast_mode_usage_percentage", "most_used_reasoning_effort_percentage"]);
function P(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : null;
}
function F(e) {
	return typeof e == "string" && e.trim() ? e.trim() : null;
}
function I(e) {
	let t = F(e);
	return t && Number.isFinite(Date.parse(t)) ? t : null;
}
function L(e) {
	return typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 100 ? e : null;
}
function R(e) {
	return typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null;
}
function z(e) {
	return typeof e == "boolean" ? e : null;
}
function We(e) {
	let t = F(e);
	return t && /^(sensor|binary_sensor)\.[a-z0-9_]+$/.test(t) ? t : null;
}
function Ge(e) {
	let t = P(e);
	if (!t) return null;
	let n = F(t.id), r = F(t.name);
	if (!n || !r || t.source !== "main" && t.source !== "additional") return null;
	let i = L(t.used_percent), a = L(t.remaining_percent);
	return {
		id: n,
		name: r,
		source: t.source,
		duration_seconds: typeof t.duration_seconds == "number" && Number.isFinite(t.duration_seconds) && t.duration_seconds > 0 ? t.duration_seconds : null,
		used_percent: i,
		remaining_percent: a,
		resets_at: I(t.resets_at),
		reached: t.reached === !0,
		entity_id: We(t.entity_id),
		...Object.hasOwn(t, "budget_pph") ? { budget_pph: typeof t.budget_pph == "number" && Number.isFinite(t.budget_pph) && t.budget_pph >= 0 ? t.budget_pph : null } : {},
		...Object.hasOwn(t, "budget_calculated_at") ? { budget_calculated_at: I(t.budget_calculated_at) } : {}
	};
}
function Ke(e) {
	let t = P(e), n = F(t?.id), r = F(t?.name);
	return !t || !n || !r || t.source !== "main" && t.source !== "additional" ? null : {
		id: n,
		name: r,
		source: t.source,
		allowed: z(t.allowed),
		reached: z(t.reached)
	};
}
function qe(e) {
	let t = P(e);
	if (!t || !Be.includes(t.reason)) return;
	let n = Array.isArray(t.affected_limits) ? [...new Set(t.affected_limits.map(F).filter((e) => e !== null))].slice(0, 50) : [];
	return {
		reached: z(t.reached),
		reason: t.reason,
		affected_limits: n,
		affected_limits_truncated: t.affected_limits_truncated === !0
	};
}
function Je(e) {
	let t = P(e);
	return !t || !Re.includes(t.state) || t.refresh_mode !== "poll" && t.refresh_mode !== "on_auth" ? null : {
		state: t.state,
		last_attempt: I(t.last_attempt),
		last_success: I(t.last_success),
		retry_at: I(t.retry_at),
		error_code: ze.includes(t.error_code) ? t.error_code : null,
		refresh_mode: t.refresh_mode,
		expected_interval_seconds: typeof t.expected_interval_seconds == "number" && Number.isFinite(t.expected_interval_seconds) && t.expected_interval_seconds > 0 ? t.expected_interval_seconds : null
	};
}
function Ye(e) {
	let t = P(e);
	return t ? {
		balance: F(t.balance),
		has_credits: z(t.has_credits),
		unlimited: z(t.unlimited),
		overage_reached: z(t.overage_reached)
	} : null;
}
function Xe(e) {
	let t = P(e);
	return t ? {
		source: F(t.source),
		limit: F(t.limit),
		used: F(t.used),
		remaining: F(t.remaining),
		used_percent: L(t.used_percent),
		remaining_percent: L(t.remaining_percent),
		resets_at: I(t.resets_at),
		reached: z(t.reached)
	} : null;
}
function Ze(e) {
	let t = P(e);
	if (!t) return null;
	let n = [];
	for (let e of He) {
		if (!Object.hasOwn(t, e)) continue;
		let r = t[e];
		if (r === null) {
			n.push([e, null]);
			continue;
		}
		if (e === "most_used_reasoning_effort") {
			let t = F(r);
			t !== null && n.push([e, t]);
			continue;
		}
		let i = Ue.has(e) ? L(r) : R(r);
		i !== null && n.push([e, i]);
	}
	return Object.fromEntries(n);
}
function Qe(e) {
	let t = P(e);
	if (!t) return null;
	let n = F(t.id), r = F(t.name);
	if (!n || !r || !Array.isArray(t.limits)) return null;
	let i = Ve.includes(t.blocker) ? t.blocker : "unknown", a = P(t.reset_credits);
	return {
		id: n,
		name: r,
		plan: F(t.plan),
		available: t.available === !0,
		updated_at: I(t.updated_at),
		blocker: i,
		limits: t.limits.map(Ge).filter((e) => e !== null),
		credits: Ye(t.credits),
		spend: Xe(t.spend),
		reset_credits: a ? {
			available_count: R(a.available_count),
			total_earned: R(a.total_earned),
			next_expiry: I(a.next_expiry),
			...[
				"usage",
				"reset_details",
				"none"
			].includes(a.count_source) ? { count_source: a.count_source } : {},
			...I(a.count_updated_at) ? { count_updated_at: I(a.count_updated_at) } : {},
			...z(a.details_consistent) === null ? {} : { details_consistent: z(a.details_consistent) },
			...typeof a.details_present == "boolean" ? { details_present: a.details_present } : {},
			...I(a.details_updated_at) ? { details_updated_at: I(a.details_updated_at) } : {}
		} : null,
		profile: Ze(t.profile),
		...Array.isArray(t.limit_statuses) ? { limit_statuses: t.limit_statuses.map(Ke).filter((e) => e !== null) } : {},
		...(() => {
			let e = qe(t.limit_summary);
			return e ? { limit_summary: e } : {};
		})(),
		...P(t.sources) ? { sources: Object.fromEntries(Le.map((e) => [e, Je(P(t.sources)?.[e])]).filter(([, e]) => e !== null)) } : {}
	};
}
function $e(e) {
	let t = P(e);
	if (!t || t.schema_version !== 1 || !Array.isArray(t.accounts)) throw Error("Unsupported Codex Usage card data");
	let n = F(t.integration_version), r = I(t.generated_at);
	if (!n || !r) throw Error("Incomplete Codex Usage card data");
	return {
		schema_version: 1,
		integration_version: n,
		generated_at: r,
		accounts: t.accounts.map(Qe).filter((e) => e !== null)
	};
}
async function et(e) {
	return $e(await e.callWS({ type: "codex_usage/card_data" }));
}
//#endregion
//#region src/config.ts
var tt = [
	"auto",
	"single",
	"all"
], nt = [
	"limits",
	"additional_limits",
	"resets",
	"pace",
	"account",
	"credits",
	"spending",
	"budget",
	"sources",
	"profile",
	"footer"
], rt = [
	"unknown",
	"ok",
	"warning",
	"critical",
	"blocked"
], B = {
	warning: 75,
	critical: 90
}, V = {
	ok: "var(--codex-usage-ok-color, #25b7f3)",
	warning: "var(--codex-usage-warning-color, #ffb74d)",
	critical: "var(--codex-usage-critical-color, #ff5f6d)",
	blocked: "var(--codex-usage-blocked-color, #d32f49)",
	unknown: "var(--codex-usage-unknown-color, #9e9e9e)"
}, H = (e = !0) => ({
	visible: e,
	values: {}
}), U = {
	type: "custom:codex-usage-card",
	account_mode: "auto",
	included_entry_ids: [],
	allow_account_switching: !0,
	compact: !0,
	title: "Codex Usage",
	show_unavailable_limits: !1,
	sections: {
		limits: H(),
		additional_limits: H("auto"),
		resets: H(),
		pace: H(),
		account: H(),
		credits: H("auto"),
		spending: H("auto"),
		budget: H("auto"),
		sources: H(!1),
		profile: H("auto"),
		footer: H()
	},
	thresholds: { ...B },
	colors: { ...V },
	stale_after_minutes: 15,
	appearance: {
		card_radius: 20,
		spacing: 16
	}
};
function W(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function it(e) {
	if (!W(e)) return {};
	try {
		return structuredClone(e);
	} catch {
		return {};
	}
}
function at(e, t) {
	return typeof e == "string" && t.includes(e);
}
function ot(e) {
	if (typeof e == "string") return e.trim() || void 0;
}
function st(e) {
	return Array.isArray(e) ? [...new Set(e.map(ot).filter((e) => !!e))] : [];
}
function ct(e) {
	let t = W(e) ? e : {};
	return Object.fromEntries(nt.map((e) => {
		let n = W(t[e]) ? t[e] : {}, r = W(n.values) ? Object.fromEntries(Object.entries(n.values).filter(([, e]) => typeof e == "boolean")) : {};
		return [e, {
			visible: typeof n.visible == "boolean" || n.visible === "auto" ? n.visible : U.sections[e].visible,
			values: r
		}];
	}));
}
function lt(e) {
	if (!W(e)) return { ...B };
	let t = e.warning, n = e.critical;
	return typeof t == "number" && Number.isFinite(t) && typeof n == "number" && Number.isFinite(n) && t >= 0 && t < n && n <= 100 ? {
		warning: t,
		critical: n
	} : { ...B };
}
function ut(e) {
	if (typeof e != "string" || !e.trim()) return !1;
	if (typeof CSS > "u" || typeof CSS.supports != "function") return !0;
	try {
		return CSS.supports("color", e);
	} catch {
		return !1;
	}
}
function dt(e) {
	let t = W(e) ? e : {};
	return Object.fromEntries(rt.map((e) => [e, ut(t[e]) ? t[e].trim() : V[e]]));
}
function ft(e, t, n, r) {
	return typeof e == "number" && Number.isFinite(e) && e >= n && e <= r ? e : t;
}
function pt(e) {
	let t = W(e) ? e : {};
	return {
		card_radius: ft(t.card_radius, U.appearance.card_radius, 0, 48),
		spacing: ft(t.spacing, U.appearance.spacing, 4, 32)
	};
}
function G(e) {
	let t = it(e), n = {
		type: typeof t.type == "string" ? t.type : U.type,
		account_mode: at(t.account_mode, tt) ? t.account_mode : U.account_mode,
		included_entry_ids: st(t.included_entry_ids),
		allow_account_switching: typeof t.allow_account_switching == "boolean" ? t.allow_account_switching : U.allow_account_switching,
		compact: typeof t.compact == "boolean" ? t.compact : U.compact,
		title: typeof t.title == "string" ? t.title : U.title,
		show_unavailable_limits: typeof t.show_unavailable_limits == "boolean" ? t.show_unavailable_limits : U.show_unavailable_limits,
		sections: ct(t.sections),
		thresholds: lt(t.thresholds),
		colors: dt(t.colors),
		stale_after_minutes: typeof t.stale_after_minutes == "number" && Number.isFinite(t.stale_after_minutes) && t.stale_after_minutes >= 5 && t.stale_after_minutes <= 1440 ? t.stale_after_minutes : U.stale_after_minutes,
		appearance: pt(t.appearance)
	}, r = ot(t.selected_entry_id);
	r && (n.selected_entry_id = r);
	for (let e of [
		"view_layout",
		"layout_options",
		"grid_options"
	]) W(t[e]) && (n[e] = t[e]);
	return Array.isArray(t.visibility) && (n.visibility = structuredClone(t.visibility)), n;
}
//#endregion
//#region src/format.ts
var mt = {
	guest: "Guest",
	free: "Free",
	go: "Go",
	plus: "Plus",
	pro: "Pro",
	prolite: "Pro Lite",
	free_workspace: "Free Workspace",
	team: "Team",
	self_serve_business_prolite: "Business Pro Lite",
	self_serve_business_usage_based: "Usage-based Business",
	business: "Business",
	ent26: "Enterprise 26",
	enterprise_cbp_automation: "Automation Enterprise",
	enterprise_cbp_usage_based: "Usage-based Enterprise",
	education: "Education",
	quorum: "Quorum",
	k12: "K–12",
	enterprise: "Enterprise",
	edu: "Edu",
	edu_plus: "Edu Plus",
	edu_pro: "Edu Pro",
	unknown: "Unknown plan"
};
function ht(e) {
	if (!e) return "";
	let t = e.trim().toLowerCase();
	return mt[t] ? mt[t] : gt(t);
}
function gt(e) {
	return e.trim().toLowerCase().split(/[_-]+/u).filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function K(e, t, n = !1) {
	return e === null || !Number.isFinite(e) ? "—" : new Intl.NumberFormat(t, {
		notation: n ? "compact" : "standard",
		maximumFractionDigits: n ? 2 : 1
	}).format(e);
}
function q(e, t) {
	if (e === null) return "—";
	let n = Number(e);
	return Number.isFinite(n) ? new Intl.NumberFormat(t, { maximumFractionDigits: 2 }).format(n) : e;
}
function _t(e, t) {
	if (!e) return null;
	let n = new Date(e);
	if (!Number.isFinite(n.getTime())) return null;
	let r = Math.max(0, Math.round((n.getTime() - t.getTime()) / 6e4));
	return {
		totalMinutes: r,
		days: Math.floor(r / 1440),
		hours: Math.floor(r % 1440 / 60),
		minutes: r % 60
	};
}
function vt(e, t) {
	if (!e) return "—";
	let n = new Date(e);
	return Number.isFinite(n.getTime()) ? new Intl.DateTimeFormat(t, {
		weekday: "short",
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	}).format(n) : "—";
}
//#endregion
//#region src/localize.ts
var yt = {
	en: {
		available: "Available",
		blocked: "Blocked",
		unavailable: "Unavailable",
		remaining: "remaining",
		usedInline: "used",
		resets: "Resets",
		pace: "Pace",
		ahead: "above plan",
		behind: "below plan",
		percentagePoints: "pp",
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
		overall: "Overall",
		resetCredits: "Reset credits",
		availableResets: "Available",
		totalEarned: "Total earned",
		nextExpiry: "Next expiry",
		balance: "Balance",
		unlimited: "Unlimited",
		creditState: "Credit state",
		used: "Used",
		limit: "Limit",
		usage: "Usage",
		source: "Scope",
		lifetimeTokens: "Lifetime tokens",
		peakDailyTokens: "Peak daily tokens",
		currentStreak: "Current streak",
		longestStreak: "Longest streak",
		longestTurn: "Longest turn",
		fastMode: "Fast mode",
		totalSkills: "Skill uses",
		uniqueSkills: "Unique skills",
		reasoning: "Reasoning preference",
		reasoningShare: "Reasoning share",
		seconds: "seconds",
		cardTitle: "Title",
		compactMode: "Start collapsed",
		accountMode: "Account mode",
		accountAuto: "Automatic",
		accountSingle: "One account",
		accountAll: "All accounts",
		selectedAccount: "Fixed account",
		includedAccounts: "Included accounts",
		accountSwitching: "Allow account switching",
		showUnavailable: "Show unavailable limits",
		appearance: "Appearance",
		staleAfter: "Out of date after (minutes)",
		semanticColors: "State colors",
		colorOk: "Healthy",
		colorWarning: "Warning",
		colorCritical: "Critical",
		colorBlocked: "Blocked",
		colorUnknown: "Unavailable",
		cardRadius: "Card radius",
		spacing: "Spacing",
		resetDefaults: "Reset to defaults",
		sectionLimits: "Limits",
		sectionAdditionalLimits: "Additional limits",
		sectionResets: "Reset times",
		sectionPace: "Pace",
		sectionAccount: "Account",
		sectionCredits: "Credits",
		sectionSpending: "Spending",
		sectionProfile: "Profile",
		sectionFooter: "Footer",
		thresholdWarning: "Warning",
		severityUnknown: "Data unavailable",
		severityOk: "Healthy",
		severityWarning: "Low usage remaining",
		severityCritical: "Critically low usage remaining",
		severityBlocked: "Limit reached",
		dataMayBeOutdated: "Data may be outdated",
		mostConstrainedTightest: "{limit} is currently your tightest constraint.",
		mostConstrainedLowRemaining: "{limit} has only {percent}% remaining.",
		mostConstrainedBlockedUsage: "Codex usage is currently blocked by your {limit}.",
		mostConstrainedBlockedSpend: "Usage is currently blocked by your spending limit.",
		mostConstrainedBlockedCredits: "Usage is currently blocked by your credit limit.",
		mostConstrainedBlockedUnknown: "Codex usage is currently unavailable.",
		resetsImminently: "Resets shortly",
		resetsInMinutes: "Resets in {minutes} min",
		resetsInHours: "Resets in {hours}h",
		resetsInHoursMinutes: "Resets in {hours}h {minutes}m",
		resetsInDays: "Resets in {days}d",
		resetsInDaysHours: "Resets in {days}d {hours}h",
		showDetails: "Show details",
		hideDetails: "Hide details",
		planLabel: "Plan",
		workspace: "Workspace",
		accountId: "Account ID",
		unlimitedCredits: "Unlimited credits",
		creditsAvailableAmount: "{amount} available",
		resetCreditAvailable: "{count} reset credit available",
		resetCreditsAvailable: "{count} reset credits available",
		expiresOn: "Expires {date}",
		budget: "Budget",
		sources: "Sources",
		sourceUsage: "Usage",
		sourceProfile: "Profile",
		sourceResetDetails: "Reset details",
		sourceWorkspaceDiscovery: "Last workspace discovery",
		sourceOk: "Current",
		sourceError: "Error",
		sourceUnsupported: "Unsupported",
		sourceDisabled: "Disabled",
		sourceNever: "No reading yet",
		sourcePoll: "Polling",
		sourceOnAuth: "On sign-in",
		alwaysShow: "Always show",
		hide: "Hide",
		historical: "Historical profile data",
		restrictionNamed: "Included usage limit reached: {limit}.",
		restrictionSomeLimit: "At least one included usage limit is reached."
	},
	de: {
		available: "Verfügbar",
		blocked: "Blockiert",
		unavailable: "Nicht verfügbar",
		remaining: "verbleibend",
		usedInline: "verbraucht",
		resets: "Zurücksetzung",
		pace: "Tempo",
		ahead: "über Plan",
		behind: "unter Plan",
		percentagePoints: "Pp",
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
		overall: "Gesamt",
		resetCredits: "Reset-Guthaben",
		availableResets: "Verfügbar",
		totalEarned: "Insgesamt erhalten",
		nextExpiry: "Nächster Verfall",
		balance: "Guthaben",
		unlimited: "Unbegrenzt",
		creditState: "Guthabenstatus",
		used: "Verbraucht",
		limit: "Limit",
		usage: "Nutzung",
		source: "Geltungsbereich",
		lifetimeTokens: "Token gesamt",
		peakDailyTokens: "Höchster Tageswert",
		currentStreak: "Aktuelle Serie",
		longestStreak: "Längste Serie",
		longestTurn: "Längster Durchlauf",
		fastMode: "Fast Mode",
		totalSkills: "Skill-Nutzungen",
		uniqueSkills: "Verschiedene Skills",
		reasoning: "Reasoning-Präferenz",
		reasoningShare: "Reasoning-Anteil",
		seconds: "Sekunden",
		cardTitle: "Titel",
		compactMode: "Eingeklappt starten",
		accountMode: "Kontomodus",
		accountAuto: "Automatisch",
		accountSingle: "Ein Konto",
		accountAll: "Alle Konten",
		selectedAccount: "Festes Konto",
		includedAccounts: "Einbezogene Konten",
		accountSwitching: "Kontowechsel erlauben",
		showUnavailable: "Nicht verfügbare Limits anzeigen",
		appearance: "Darstellung",
		staleAfter: "Veraltet nach (Minuten)",
		semanticColors: "Zustandsfarben",
		colorOk: "Gesund",
		colorWarning: "Warnung",
		colorCritical: "Kritisch",
		colorBlocked: "Blockiert",
		colorUnknown: "Nicht verfügbar",
		cardRadius: "Kartenradius",
		spacing: "Abstand",
		resetDefaults: "Auf Standard zurücksetzen",
		sectionLimits: "Limits",
		sectionAdditionalLimits: "Zusätzliche Limits",
		sectionResets: "Zurücksetzungen",
		sectionPace: "Tempo",
		sectionAccount: "Konto",
		sectionCredits: "Guthaben",
		sectionSpending: "Ausgaben",
		sectionProfile: "Profil",
		sectionFooter: "Fußzeile",
		thresholdWarning: "Warnung",
		severityUnknown: "Daten nicht verfügbar",
		severityOk: "Gesund",
		severityWarning: "Wenig Nutzung übrig",
		severityCritical: "Kritisch wenig Nutzung übrig",
		severityBlocked: "Limit erreicht",
		dataMayBeOutdated: "Daten könnten veraltet sein",
		mostConstrainedTightest: "{limit} ist derzeit dein engstes Limit.",
		mostConstrainedLowRemaining: "{limit} hat nur noch {percent}% übrig.",
		mostConstrainedBlockedUsage: "Die Codex-Nutzung wird derzeit durch dein {limit} blockiert.",
		mostConstrainedBlockedSpend: "Die Nutzung wird derzeit durch dein Ausgabenlimit blockiert.",
		mostConstrainedBlockedCredits: "Die Nutzung wird derzeit durch dein Guthabenlimit blockiert.",
		mostConstrainedBlockedUnknown: "Die Codex-Nutzung ist derzeit nicht verfügbar.",
		resetsImminently: "Setzt sich gleich zurück",
		resetsInMinutes: "Setzt sich in {minutes} Min. zurück",
		resetsInHours: "Setzt sich in {hours}h zurück",
		resetsInHoursMinutes: "Setzt sich in {hours}h {minutes}m zurück",
		resetsInDays: "Setzt sich in {days}d zurück",
		resetsInDaysHours: "Setzt sich in {days}d {hours}h zurück",
		showDetails: "Details anzeigen",
		hideDetails: "Details ausblenden",
		planLabel: "Plan",
		workspace: "Workspace",
		accountId: "Konto-ID",
		unlimitedCredits: "Unbegrenztes Guthaben",
		creditsAvailableAmount: "{amount} verfügbar",
		resetCreditAvailable: "{count} Reset-Guthaben verfügbar",
		resetCreditsAvailable: "{count} Reset-Guthaben verfügbar",
		expiresOn: "Läuft ab am {date}",
		budget: "Budget",
		sources: "Quellen",
		sourceUsage: "Nutzung",
		sourceProfile: "Profil",
		sourceResetDetails: "Reset-Details",
		sourceWorkspaceDiscovery: "Letzte Workspace-Erkennung",
		sourceOk: "Aktuell",
		sourceError: "Fehler",
		sourceUnsupported: "Nicht unterstützt",
		sourceDisabled: "Deaktiviert",
		sourceNever: "Noch keine Daten",
		sourcePoll: "Abfrage",
		sourceOnAuth: "Bei Anmeldung",
		alwaysShow: "Immer anzeigen",
		hide: "Ausblenden",
		historical: "Historische Profildaten",
		restrictionNamed: "Inklusivlimit erreicht: {limit}.",
		restrictionSomeLimit: "Mindestens ein Inklusivlimit ist erreicht."
	}
};
function bt(e, t, n) {
	let r = yt[e?.toLowerCase().startsWith("de") ? "de" : "en"][t];
	return n ? r.replace(/\{(\w+)\}/g, (e, t) => t in n ? String(n[t]) : e) : r;
}
//#endregion
//#region src/status.ts
var J = {
	unknown: 0,
	ok: 1,
	warning: 2,
	critical: 3,
	blocked: 4
};
function xt(e, t, n) {
	return t ? "blocked" : typeof e != "number" || !Number.isFinite(e) ? "unknown" : e >= n.critical ? "critical" : e >= n.warning ? "warning" : "ok";
}
function St(e) {
	return e.reduce((e, t) => J[t] > J[e] ? t : e, "unknown");
}
//#endregion
//#region src/view-model.ts
function Ct(e) {
	if (!e) return null;
	let t = new Date(e);
	return Number.isFinite(t.getTime()) ? t : null;
}
function wt(e, t, n) {
	let r = Ct(e);
	return r === null || n.getTime() - r.getTime() > t * 6e4;
}
function Tt(e, t) {
	return !e || e.refresh_mode !== "poll" || e.state === "disabled" || e.state === "unsupported" ? !1 : e.state === "error" || e.state === "never" ? !0 : !e.last_success || !e.expected_interval_seconds ? !1 : t.getTime() - new Date(e.last_success).getTime() > e.expected_interval_seconds * 2e3;
}
function Et(e, t) {
	if (!e.duration_seconds || !e.resets_at || e.used_percent === null) return null;
	let n = Ct(e.resets_at);
	if (!n) return null;
	let r = n.getTime() - e.duration_seconds * 1e3, i = (t.getTime() - r) / (e.duration_seconds * 1e3) * 100;
	return !Number.isFinite(i) || i < 0 || i > 100 ? null : e.used_percent - i;
}
function Dt(e, t) {
	if (e.reached !== t.reached) return e.reached;
	let n = e.remaining_percent ?? Infinity, r = t.remaining_percent ?? Infinity;
	return n === r ? e.source !== t.source && e.source === "main" : n < r;
}
function Ot(e) {
	return e.length === 0 ? null : e.reduce((e, t) => Dt(t, e) ? t : e);
}
function Y(e, t, n) {
	if (t !== "auto") return t;
	switch (e) {
		case "credits": return n.credits !== null || n.reset_credits !== null;
		case "spending": return n.spend !== null;
		case "profile": return n.profile !== null;
		case "additional_limits": return n.limits.some((e) => e.source === "additional");
		case "budget": return n.limits.some((e) => e.budget_pph !== null && e.budget_pph !== void 0);
		case "sources": return Object.values(n.sources ?? {}).some((e) => Tt(e, /* @__PURE__ */ new Date()));
		default: return !0;
	}
}
function kt(e, t, n) {
	let r = !e.available || wt(e.updated_at, t.stale_after_minutes, n), i = e.limits.map((e) => ({
		...e,
		severity: xt(e.used_percent, e.reached, t.thresholds),
		pace: Et(e, n)
	})), a = e.blocker !== null || e.limit_summary?.reached === !0 ? "blocked" : St(i.map((e) => e.severity));
	return {
		...e,
		limits: i,
		severity: a,
		stale: r,
		mostConstrainedLimit: Ot(i)
	};
}
function At(e, t, n, r = /* @__PURE__ */ new Date()) {
	let i = e.accounts;
	t.included_entry_ids.length > 0 && (i = i.filter((e) => t.included_entry_ids.includes(e.id)));
	let a = i.map((e) => kt(e, t, r)), o = n ?? t.selected_entry_id, s = o ? a.find((e) => e.id === o) ?? null : null;
	s ||= t.account_mode === "single" ? a[0] ?? null : [...a].sort((e, t) => J[t.severity] - J[e.severity])[0] ?? null;
	let c = t.account_mode === "single" ? s : null;
	return {
		accounts: a,
		selectedAccount: s,
		severity: c ? c.severity : St(a.map((e) => e.severity)),
		stale: c ? c.stale : a.some((e) => e.stale),
		generatedAt: Ct(e.generated_at),
		integrationVersion: e.integration_version
	};
}
//#endregion
//#region \0@oxc-project+runtime@0.144.0/helpers/esm/decorate.js
function X(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/codex-usage-card.ts
var jt = "codex_usage_card_data_updated", Mt = [
	{
		key: "lifetime_tokens",
		label: "lifetimeTokens",
		compact: !0
	},
	{
		key: "total_threads",
		label: "threads",
		compact: !0
	},
	{
		key: "peak_daily_tokens",
		label: "peakDailyTokens",
		compact: !0
	},
	{
		key: "current_streak_days",
		label: "currentStreak",
		suffix: "days"
	},
	{
		key: "longest_streak_days",
		label: "longestStreak",
		suffix: "days"
	},
	{
		key: "longest_running_turn_sec",
		label: "longestTurn",
		suffix: "seconds"
	},
	{
		key: "fast_mode_usage_percentage",
		label: "fastMode"
	},
	{
		key: "total_skills_used",
		label: "totalSkills",
		compact: !0
	},
	{
		key: "unique_skills_used",
		label: "uniqueSkills",
		compact: !0
	},
	{
		key: "most_used_reasoning_effort",
		label: "reasoning"
	},
	{
		key: "most_used_reasoning_effort_percentage",
		label: "reasoningShare"
	}
], Nt = {
	unknown: "severityUnknown",
	ok: "severityOk",
	warning: "severityWarning",
	critical: "severityCritical",
	blocked: "severityBlocked"
};
function Z(e, t) {
	return e === null ? "—" : `${new Intl.NumberFormat(t, { maximumFractionDigits: 1 }).format(e)}%`;
}
function Pt(e) {
	return e.length > 4 ? `…${e.slice(-4)}` : e;
}
var Q = class extends j {
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
	#i = !0;
	get detailsExpanded() {
		return this.#i;
	}
	set detailsExpanded(e) {
		this.#i = e;
	}
	#a = /* @__PURE__ */ new Date();
	get now() {
		return this.#a;
	}
	set now(e) {
		this.#a = e;
	}
	config = structuredClone(U);
	unsubscribe;
	subscribedConnection;
	loading = !1;
	minuteTimer;
	connectedCallback() {
		super.connectedCallback(), this.startMinuteTimer();
	}
	static getStubConfig() {
		return {};
	}
	static async getConfigElement() {
		return document.createElement("codex-usage-card-editor");
	}
	setConfig(e) {
		if (e.type !== "custom:codex-usage-card") throw Error("Invalid card type");
		this.config = G(e), this.sessionEntryId = void 0, this.detailsExpanded = !this.config.compact, this.requestUpdate();
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 3,
			max_columns: 12
		};
	}
	getCardSize() {
		return this.detailsExpanded ? 7 : 4;
	}
	updated(e) {
		e.has("hass") && this.hass && this.startClient().catch(() => {
			this.error = !0;
		});
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0, this.subscribedConnection = void 0, this.stopMinuteTimer();
	}
	startMinuteTimer() {
		this.minuteTimer ||= setInterval(() => {
			this.now = /* @__PURE__ */ new Date();
		}, 6e4);
	}
	stopMinuteTimer() {
		this.minuteTimer && clearInterval(this.minuteTimer), this.minuteTimer = void 0;
	}
	async startClient() {
		if (!this.hass) return;
		let e = this.subscribedConnection !== this.hass.connection || !this.snapshot;
		if (this.subscribedConnection !== this.hass.connection) {
			this.unsubscribe?.(), this.unsubscribe = void 0;
			let e = this.hass.connection;
			this.subscribedConnection = e;
			try {
				let t = await e.subscribeEvents(() => void this.loadSnapshot(), jt);
				this.subscribedConnection === e ? this.unsubscribe = t : t();
			} catch {
				this.subscribedConnection === e && (this.error = !0, this.subscribedConnection = void 0);
			}
		}
		e && await this.loadSnapshot();
	}
	async loadSnapshot() {
		if (!(!this.hass || this.loading)) {
			this.loading = !0;
			try {
				this.snapshot = await et(this.hass), this.error = !1;
			} catch {
				this.error = !0;
			} finally {
				this.loading = !1;
			}
		}
	}
	t(e, t) {
		return bt(this.hass?.locale?.language ?? this.hass?.language, e, t);
	}
	get locale() {
		return this.hass?.locale?.language ?? this.hass?.language;
	}
	statusLabel(e) {
		return this.t(Nt[e]);
	}
	limitLabel(e) {
		let t = (t) => e.duration_seconds !== null && e.duration_seconds >= t * .95 && e.duration_seconds <= t * 1.05;
		return t(18e3) ? this.t("fiveHours") : t(604800) ? this.t("week") : e.duration_seconds && e.duration_seconds % 86400 == 0 ? `${e.duration_seconds / 86400} ${this.t("days")}` : e.name || this.t("unknownWindow");
	}
	absoluteResetLabel(e) {
		return vt(e, this.locale);
	}
	relativeResetLabel(e) {
		let t = _t(e, this.now);
		if (!t) return "—";
		let { totalMinutes: n, days: r, hours: i, minutes: a } = t;
		return n === 0 ? this.t("resetsImminently") : n < 60 ? this.t("resetsInMinutes", { minutes: n }) : r === 0 ? a === 0 ? this.t("resetsInHours", { hours: i }) : this.t("resetsInHoursMinutes", {
			hours: i,
			minutes: a
		}) : r < 7 ? i === 0 ? this.t("resetsInDays", { days: r }) : this.t("resetsInDaysHours", {
			days: r,
			hours: i
		}) : this.t("resetsInDays", { days: r });
	}
	calloutLabel(e) {
		if (e.blocker === "spend") return this.t("mostConstrainedBlockedSpend");
		if (e.blocker === "credits") return this.t("mostConstrainedBlockedCredits");
		if (e.blocker === "unknown") return this.t("mostConstrainedBlockedUnknown");
		if (e.limit_summary?.reason === "additional_limit") {
			let t = e.limit_statuses?.find((e) => e.reached === !0);
			return t ? this.t("restrictionNamed", { limit: t.name }) : this.t("restrictionSomeLimit");
		}
		let t = e.mostConstrainedLimit;
		return t ? e.blocker === "usage_limit" || t.reached ? this.t("mostConstrainedBlockedUsage", { limit: this.limitLabel(t) }) : t.severity === "warning" || t.severity === "critical" ? this.t("mostConstrainedLowRemaining", {
			limit: this.limitLabel(t),
			percent: K(t.remaining_percent, this.locale)
		}) : this.t("mostConstrainedTightest", { limit: this.limitLabel(t) }) : null;
	}
	openMoreInfo(e) {
		e && this.dispatchEvent(new CustomEvent("hass-more-info", {
			detail: { entityId: e },
			bubbles: !0,
			composed: !0
		}));
	}
	valueVisible(e, t) {
		return this.config.sections[e].values[t] !== !1;
	}
	eligibleLimits(e, t) {
		let n = t === "main" ? "limits" : "additional_limits";
		return e.limits.filter((e) => e.source === t && this.config.sections[n].values[e.id] !== !1 && (t === "main" || this.config.show_unavailable_limits || e.used_percent !== null || e.remaining_percent !== null));
	}
	mainLimits(e) {
		let t = [{
			id: "codex:primary:five_hour",
			name: "Codex",
			source: "main",
			duration_seconds: 18e3,
			used_percent: null,
			remaining_percent: null,
			resets_at: null,
			reached: !1,
			entity_id: null,
			severity: "unknown",
			pace: null
		}, {
			id: "codex:primary:weekly",
			name: "Codex",
			source: "main",
			duration_seconds: 604800,
			used_percent: null,
			remaining_percent: null,
			resets_at: null,
			reached: !1,
			entity_id: null,
			severity: "unknown",
			pace: null
		}], n = this.eligibleLimits(e, "main");
		return [...t.map((e) => n.find((t) => t.id === e.id) ?? e), ...n.filter((e) => !t.some((t) => t.id === e.id))].filter((e) => this.config.sections.limits.values[e.id] !== !1);
	}
	renderLimitRow(e, t) {
		let n = e.used_percent ?? (e.remaining_percent === null ? null : 100 - e.remaining_percent), r = e.remaining_percent ?? (n === null ? null : 100 - n), i = w` <div class="limit-head">
        <span class="limit-name">${this.limitLabel(e)}</span>
        ${this.config.sections.resets.visible && this.valueVisible("resets", e.id) && e.resets_at ? w`<span class="limit-relative">${this.relativeResetLabel(e.resets_at)}</span>` : E}
      </div>
      <div class="limit-body">
        <div class="limit-metric">
          ${t ? w`<div
                  class="ring ${r === null ? "unknown" : ""}"
                  style=${r === null ? E : `--progress:${r}`}
                  aria-hidden="true"
                >
                  <strong>${Z(r, this.locale)}</strong>
                </div>` : w`<strong class="limit-value">${Z(r, this.locale)}</strong>`}
          <span class="limit-remaining-label">${this.t("remaining")}</span>
        </div>
        <div class="limit-copy">
          <div
            class="bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuetext=${Z(r, this.locale)}
            aria-valuenow=${r === null ? E : r}
          >
            ${r === null ? E : w`<span style=${`width:${r}%`}></span>`}
          </div>
          <span class="limit-used"
            >${Z(n, this.locale)} ${this.t("usedInline")}</span
          >
          ${this.config.sections.pace.visible && this.valueVisible("pace", e.id) && e.pace !== null ? w`<small
                  >${this.t("pace")}: ${K(Math.abs(e.pace), this.locale)}
                  ${this.t("percentagePoints")}
                  ${e.pace >= 0 ? this.t("ahead") : this.t("behind")}</small
                >` : E}
        </div>
      </div>
      ${this.config.sections.resets.visible && this.valueVisible("resets", e.id) && e.resets_at ? w`<small class="limit-absolute"
              >${this.t("resets")}: ${this.absoluteResetLabel(e.resets_at)}</small
            >` : E}`;
		return e.entity_id ? w`<button
          class="limit-row"
          data-limit-id=${e.id}
          @click=${() => this.openMoreInfo(e.entity_id)}
        >
          ${i}
        </button>` : w`<div class="limit-row" data-limit-id=${e.id}>${i}</div>`;
	}
	renderBudgetRows(e) {
		if (!Y("budget", this.config.sections.budget.visible, e)) return E;
		let t = e.stale || !e.available ? [] : e.limits.flatMap((e) => {
			if (!this.valueVisible("budget", e.id) || e.budget_pph === null || e.budget_pph === void 0) return [];
			let t = e.budget_calculated_at ? new Date(e.budget_calculated_at) : null;
			if (!t || !Number.isFinite(t.getTime()) || this.now.getTime() - t.getTime() > this.config.stale_after_minutes * 6e4) return [];
			let n = _t(e.resets_at, this.now);
			if (!n || n.totalMinutes < 1) return [];
			let r = (e.duration_seconds ?? 0) >= 86400, i = r ? e.budget_pph * 24 : e.budget_pph;
			return [w`<div class="info-row" data-budget-id=${e.id}>
                <span class="info-label">${this.limitLabel(e)}</span
                ><span class="info-value"
                  >${K(i, this.locale)} ${r ? "pp/day" : "pp/h"}</span
                >
              </div>`];
		});
		return t.length ? w`<div class="section-label">${this.t("budget")}</div>
          ${t}` : E;
	}
	renderSources(e) {
		if (!Y("sources", this.config.sections.sources.visible, e)) return E;
		let t = {
			usage: "sourceUsage",
			profile: "sourceProfile",
			reset_details: "sourceResetDetails",
			workspace_discovery: "sourceWorkspaceDiscovery"
		}, n = {
			ok: "sourceOk",
			error: "sourceError",
			unsupported: "sourceUnsupported",
			disabled: "sourceDisabled",
			never: "sourceNever"
		}, r = Object.entries(e.sources ?? {}).map(([e, r]) => w`<div class="info-row" data-source=${e}>
          <span class="info-label">${this.t(t[e] ?? "sources")}</span
          ><span class="info-value"
            >${this.t(n[r.state] ?? "sourceNever")} ·
            ${this.t(r.refresh_mode === "poll" ? "sourcePoll" : "sourceOnAuth")}</span
          >
        </div>`);
		return r.length ? w`<div class="section-label">${this.t("sources")}</div>
          ${r}` : this.config.sections.sources.visible === !0 ? w`<div class="info-row"><span class="info-value">—</span></div>` : E;
	}
	renderAdditionalLimits(e) {
		if (!Y("additional_limits", this.config.sections.additional_limits.visible, e)) return E;
		let t = this.eligibleLimits(e, "additional");
		return t.length ? w`<div class="section-label">${this.t("sectionAdditionalLimits")}</div>
      ${t.map((e) => this.renderLimitRow(e, !1))}` : this.emptyOptional("additional_limits", "sectionAdditionalLimits");
	}
	emptyOptional(e, t) {
		let n = this.config.sections[e], r = Object.values(n.values);
		return n.visible !== !0 || r.length > 0 && r.every((e) => e === !1) ? E : w`<div class="section-label">${this.t(t)}</div>
      <div class="info-row" data-empty-section=${e}><span class="info-value">—</span></div>`;
	}
	renderResetSummary(e) {
		if (!e.reset_credits || !this.valueVisible("credits", "reset_credits") || !Y("credits", this.config.sections.credits.visible, e)) return E;
		let t = e.reset_credits.available_count, n = t === null ? "—" : this.t(t === 1 ? "resetCreditAvailable" : "resetCreditsAvailable", { count: t });
		return w`<div class="info-row" data-core="resets">
      <span class="info-label">${this.t("availableResets")}</span
      ><span class="info-value">${n}</span>
    </div>`;
	}
	renderCreditsRows(e) {
		if (!Y("credits", this.config.sections.credits.visible, e)) return E;
		if (!e.credits) return this.emptyOptional("credits", "sectionCredits");
		if (!this.valueVisible("credits", "balance")) return E;
		let t = e.credits, n = t.unlimited ? this.t("unlimitedCredits") : t.balance === null ? t.has_credits === !1 ? this.t("unavailable") : this.t("creditsAvailableAmount", { amount: "—" }) : t.has_credits === !1 ? `${this.t("balance")}: ${q(t.balance, this.locale)}` : this.t("creditsAvailableAmount", { amount: q(t.balance, this.locale) });
		return w`<div class="info-row" data-detail="credits">
      <span class="info-label">${this.t("credits")}</span>
      <span class="info-value">${n}</span>
    </div>`;
	}
	renderResetCreditsRows(e) {
		if (!Y("credits", this.config.sections.credits.visible, e) || !e.reset_credits || !this.valueVisible("credits", "reset_credits")) return E;
		let t = e.reset_credits, n = t.available_count, r = [w`<div class="info-row" data-detail="reset-credits">
        <span class="info-label">${this.t("resetCredits")}</span>
        <span class="info-value"
          >${n === null ? "—" : this.t(n === 1 ? "resetCreditAvailable" : "resetCreditsAvailable", { count: n })}</span
        >
      </div>`];
		return this.valueVisible("credits", "total_earned") && t.total_earned !== null && r.push(w`<div class="info-row" data-credit-key="total_earned">
          <span class="info-label">${this.t("totalEarned")}</span>
          <span class="info-value">${K(t.total_earned, this.locale)}</span>
        </div>`), this.valueVisible("credits", "next_expiry") && t.next_expiry && r.push(w`<div class="info-row" data-credit-key="next_expiry">
          <span class="info-label">${this.t("nextExpiry")}</span>
          <span class="info-value"
            >${this.t("expiresOn", { date: this.absoluteResetLabel(t.next_expiry) })}</span
          >
        </div>`), w`${r}`;
	}
	renderSpendingRows(e) {
		if (!Y("spending", this.config.sections.spending.visible, e)) return E;
		if (!e.spend) return this.emptyOptional("spending", "sectionSpending");
		let t = e.spend, n = [
			["remaining", t.remaining],
			["limit", t.limit],
			["used", t.used],
			["used_percent", t.used_percent]
		].find(([e, t]) => this.valueVisible("spending", e) && t !== null);
		if (!n) return this.emptyOptional("spending", "sectionSpending");
		let [r, i] = n, a = [w`<div class="info-row" data-detail="spending">
        <span class="info-label">${this.t("spending")}</span>
        <span class="info-value"
          >${r === "used_percent" ? Z(i, this.locale) : q(i, this.locale)}</span
        >
      </div>`];
		return this.valueVisible("spending", "used_percent") && t.used_percent !== null && (a.push(w`<div
          class="bar bar--mini"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${t.used_percent}
        >
          <span style=${`width:${t.used_percent}%`}></span>
        </div>`), a.push(w`<div class="info-row" data-spend-key="used_percent">
          <span class="info-label">${this.t("usage")}</span>
          <span class="info-value">${Z(t.used_percent, this.locale)}</span>
        </div>`)), this.valueVisible("spending", "used") && t.used !== null && a.push(w`<div class="info-row" data-spend-key="used">
          <span class="info-label">${this.t("used")}</span>
          <span class="info-value">${q(t.used, this.locale)}</span>
        </div>`), this.valueVisible("spending", "limit") && t.limit !== null && a.push(w`<div class="info-row" data-spend-key="limit">
          <span class="info-label">${this.t("limit")}</span>
          <span class="info-value">${q(t.limit, this.locale)}</span>
        </div>`), this.valueVisible("spending", "source") && t.source && a.push(w`<div class="info-row" data-spend-key="source">
          <span class="info-label">${this.t("source")}</span>
          <span class="info-value">${t.source}</span>
        </div>`), this.valueVisible("spending", "reset") && t.resets_at && a.push(w`<div class="info-row" data-spend-key="reset">
          <span class="info-label">${this.t("resets")}</span>
          <span class="info-value">${this.absoluteResetLabel(t.resets_at)}</span>
        </div>`), w`${a}`;
	}
	renderProfileRows(e) {
		if (!Y("profile", this.config.sections.profile.visible, e)) return E;
		if (!e.profile) return this.emptyOptional("profile", "sectionProfile");
		let t = Mt.flatMap((t) => {
			if (!this.valueVisible("profile", t.key)) return [];
			let n = e.profile?.[t.key];
			if (n == null) return [];
			let r = `${typeof n == "number" ? t.key === "fast_mode_usage_percentage" || t.key === "most_used_reasoning_effort_percentage" ? Z(n, this.locale) : K(n, this.locale, t.compact) : gt(n)}${t.suffix ? ` ${this.t(t.suffix)}` : ""}`;
			return [w`<div class="info-row" data-profile-key=${t.key}>
          <span class="info-label">${this.t(t.label)}</span>
          <span class="info-value">${r}</span>
        </div>`];
		});
		if (!t.length) return this.emptyOptional("profile", "sectionProfile");
		let n = e.sources?.profile;
		return w`${n && (n.state !== "ok" || n.last_success && new Date(n.last_success).getTime() < this.now.getTime() - (n.expected_interval_seconds ?? 3600) * 2e3) ? w`<small data-profile-historical>${this.t("historical")}</small>` : E}${t}`;
	}
	renderAccountRows(e) {
		if (!Y("account", this.config.sections.account.visible, e)) return E;
		let t = [];
		return this.valueVisible("account", "plan") && e.plan && t.push(w`<div class="info-row">
          <span class="info-label">${this.t("planLabel")}</span>
          <span class="info-value">${ht(e.plan)}</span>
        </div>`), this.valueVisible("account", "workspace") && t.push(w`<div class="info-row">
          <span class="info-label">${this.t("workspace")}</span>
          <span class="info-value">${e.name}</span>
        </div>`), this.valueVisible("account", "account_id") && t.push(w`<div class="info-row">
          <span class="info-label">${this.t("accountId")}</span>
          <span class="info-value">${Pt(e.id)}</span>
        </div>`), t.length ? w`<div class="account-details" data-detail="account">${t}</div>` : this.emptyOptional("account", "sectionAccount");
	}
	renderDetails(e) {
		let t = this.renderCreditsRows(e), n = this.renderResetCreditsRows(e), r = this.renderSpendingRows(e), i = this.renderProfileRows(e), a = this.renderAccountRows(e), o = this.renderBudgetRows(e), s = this.renderSources(e), c = [
			this.renderAdditionalLimits(e),
			t !== E || n !== E ? w`<div class="section-label">${this.t("sectionCredits")}</div>
            ${t}${n}` : E,
			r === E ? E : w`<div class="section-label">${this.t("sectionSpending")}</div>
            ${r}`,
			i === E ? E : w`<div class="section-label">${this.t("sectionProfile")}</div>
            ${i}`,
			a === E ? E : w`<div class="section-label">${this.t("sectionAccount")}</div>
            ${a}`,
			o,
			s
		].filter((e) => e !== E);
		return c.length ? w`<div class="details">${c}</div>` : E;
	}
	render() {
		let e = this.snapshot ? At(this.snapshot, this.config, this.sessionEntryId, this.now) : null, t = e?.selectedAccount ?? null, n = e?.severity ?? "unknown", r = this.error ? !0 : e?.stale ?? !1, i = !!(e && e.accounts.length > 1) && this.config.account_mode !== "single", a = ht(t?.plan ?? null), o = t ? i ? `${t.name}${a ? ` · ${a}` : ""}` : a : "", s = t ? this.mainLimits(t) : [], c = t ? this.renderDetails(t) : E, l = c !== E, u = t ? this.calloutLabel(t) : null, d = `--state-color:${this.config.colors[n]};--card-radius:${this.config.appearance.card_radius}px;--card-spacing:${this.config.appearance.spacing}px`;
		return w`<ha-card class="${n}${r ? " stale" : ""}" style=${d}>
      <div class="surface">
        <header>
          <div>
            <h2>${this.config.title}</h2>
            ${o ? w`<p>${o}</p>` : E}
          </div>
          <span class="status"
            >${i ? `${this.t("overall")} · ` : ""}${this.statusLabel(n)}</span
          >
        </header>
        ${r ? w`<p class="freshness">
                ${this.t("dataMayBeOutdated")}${t ? w` · ${this.t("updated")}: ${this.absoluteResetLabel(t.updated_at)}` : E}
              </p>` : E}
        ${i && e && this.config.allow_account_switching ? w`<nav aria-label=${this.t("account")}>
                ${e.accounts.map((e) => w`<button
                      class="account-chip ${e.id === t?.id ? "selected" : ""}"
                      data-entry-id=${e.id}
                      @click=${() => this.sessionEntryId = e.id}
                    >
                      <i style=${`--chip-color:${this.config.colors[e.severity]}`}></i
                      >${e.name}
                    </button>`)}
              </nav>` : E}
        ${t && u ? w`<p class="callout">${u}</p>` : E}
        ${t ? this.renderResetSummary(t) : E}
        ${t ? this.config.sections.limits.visible ? s.length ? w`<main class="limits">
                    ${s.map((e) => this.renderLimitRow(e, !0))}
                  </main>` : w`<div class="empty">
                    ${this.error ? this.t("unavailable") : this.t("noData")}
                  </div>` : E : w`<div class="empty">${this.t("unavailable")}</div>`}
        ${l ? w`<button
                class="details-toggle"
                @click=${() => this.detailsExpanded = !this.detailsExpanded}
              >
                <span>${this.t(this.detailsExpanded ? "hideDetails" : "showDetails")}</span>
                <i class="chevron ${this.detailsExpanded ? "open" : ""}"></i>
              </button>` : E}
        ${l && this.detailsExpanded ? c : E}
        ${t && this.config.sections.footer.visible ? w`<footer>
                ${this.valueVisible("footer", "updated") ? w`<span
                        >${this.t("updated")}: ${this.absoluteResetLabel(t.updated_at)}</span
                      >` : E}
                ${this.valueVisible("footer", "version") ? w`<span>v${e?.integrationVersion}</span>` : E}
              </footer>` : E}
      </div>
    </ha-card>`;
	}
	static styles = o`
    :host {
      display: block;
      color: var(--primary-text-color);
      --codex-space-1: 4px;
      --codex-space-2: 8px;
      --codex-space-3: 12px;
      --codex-space-4: 16px;
      --codex-space-5: 24px;
      --codex-progress-height: 6px;
      --codex-chip-height: 22px;
      --codex-icon-size: 16px;
      --codex-radius: 8px;
      --codex-secondary-opacity: 0.62;
    }
    ha-card {
      display: block;
      --state-color: var(--codex-usage-ok-color, #25b7f3);
      position: relative;
      overflow: hidden;
      border-radius: var(--codex-usage-card-radius, var(--card-radius));
      border: 1px solid color-mix(in srgb, var(--state-color) 45%, var(--divider-color));
      background: var(--ha-card-background, var(--card-background-color));
      box-shadow: var(--ha-card-box-shadow, none);
      transition: border-color 0.25s ease;
    }
    ha-card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--state-color);
      opacity: 0.85;
    }
    .surface {
      padding: var(--codex-usage-spacing, var(--card-spacing, var(--codex-space-4)));
      display: grid;
      gap: var(--codex-space-4);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--codex-space-4);
    }
    h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 650;
      letter-spacing: -0.01em;
    }
    p {
      margin: var(--codex-space-1) 0 0;
      color: var(--secondary-text-color);
      font-size: 0.82rem;
    }
    .status {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      height: var(--codex-chip-height);
      padding: 0 var(--codex-space-2);
      border-radius: 999px;
      background: color-mix(in srgb, var(--state-color) 15%, transparent);
      color: var(--state-color);
      font-size: 0.74rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .freshness {
      margin: calc(-1 * var(--codex-space-2)) 0 0;
      font-size: 0.76rem;
      opacity: var(--codex-secondary-opacity);
    }
    .callout {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--state-color);
    }
    nav {
      display: flex;
      gap: var(--codex-space-2);
      overflow-x: auto;
      scrollbar-width: none;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      padding: 0;
    }
    .account-chip {
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: var(--codex-space-1) var(--codex-space-2);
      display: flex;
      gap: var(--codex-space-1);
      align-items: center;
      cursor: pointer;
    }
    .account-chip i {
      width: 7px;
      height: 7px;
      background: var(--chip-color);
      border-radius: 50%;
    }
    .account-chip.selected {
      border-color: var(--state-color);
      color: var(--state-color);
    }
    .limits {
      display: grid;
      gap: var(--codex-space-4);
    }
    .limit-row {
      display: block;
      width: 100%;
      text-align: left;
      min-width: 0;
    }
    button.limit-row {
      cursor: pointer;
    }
    .limit-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--codex-space-2);
    }
    .limit-name {
      font-weight: 650;
      font-size: 0.95rem;
    }
    .limit-relative {
      font-size: 0.76rem;
      color: var(--secondary-text-color);
    }
    .limit-body {
      display: flex;
      align-items: center;
      gap: var(--codex-space-3);
      margin-top: var(--codex-space-2);
    }
    .limit-metric {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--codex-space-1);
    }
    .limit-remaining-label {
      font-size: 0.66rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--secondary-text-color);
      opacity: var(--codex-secondary-opacity);
    }
    .ring {
      --progress: 0;
      width: 56px;
      height: 56px;
      flex: 0 0 56px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background:
        radial-gradient(
          circle,
          var(--ha-card-background, var(--card-background-color)) 60%,
          transparent 62%
        ),
        conic-gradient(
          var(--state-color) calc(var(--progress) * 1%),
          color-mix(in srgb, var(--divider-color) 65%, transparent) 0
        );
    }
    .ring strong {
      font-size: 1rem;
    }
    .limit-value {
      font-size: 1.6rem;
      font-weight: 650;
      min-width: 60px;
      text-align: center;
    }
    .limit-copy {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: var(--codex-space-1);
    }
    .bar {
      height: var(--codex-progress-height);
      overflow: hidden;
      border-radius: 99px;
      background: color-mix(in srgb, var(--divider-color) 65%, transparent);
    }
    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--state-color);
      transition: width 0.2s ease;
    }
    .bar--mini {
      margin-top: var(--codex-space-1);
    }
    .limit-used,
    small {
      color: var(--secondary-text-color);
      font-size: 0.76rem;
    }
    .limit-absolute {
      display: block;
      margin-top: var(--codex-space-1);
      color: var(--secondary-text-color);
      opacity: var(--codex-secondary-opacity);
      font-size: 0.72rem;
    }
    .section-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--secondary-text-color);
      opacity: var(--codex-secondary-opacity);
    }
    .section-label:not(:first-child) {
      margin-top: var(--codex-space-2);
    }
    .details {
      display: grid;
      gap: var(--codex-space-4);
      animation: codex-fade-in 180ms ease;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--codex-space-2);
      font-size: 0.85rem;
    }
    .info-label {
      color: var(--secondary-text-color);
    }
    .info-value {
      font-weight: 600;
      text-align: right;
    }
    .account-details {
      display: grid;
      gap: var(--codex-space-2);
    }
    .details-toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--codex-space-2);
      justify-self: start;
      cursor: pointer;
      color: var(--primary-color);
      font-size: 0.8rem;
      font-weight: 600;
    }
    .chevron {
      width: var(--codex-icon-size);
      height: var(--codex-icon-size);
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: rotate(45deg);
      transition: transform 0.15s ease;
    }
    .chevron.open {
      transform: rotate(-135deg);
    }
    footer {
      display: flex;
      justify-content: space-between;
      gap: var(--codex-space-2);
      color: var(--secondary-text-color);
      font-size: 0.72rem;
      opacity: var(--codex-secondary-opacity);
    }
    .empty {
      padding: var(--codex-space-5) var(--codex-space-2);
      text-align: center;
      color: var(--secondary-text-color);
    }
    button:focus-visible {
      outline: 2px solid var(--state-color);
      outline-offset: 2px;
    }
    @keyframes codex-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @media (max-width: 479px) {
      .surface {
        padding: var(--codex-space-3);
      }
      .limit-head {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--codex-space-1);
      }
      footer {
        flex-direction: column;
        gap: var(--codex-space-1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      ha-card,
      .bar span,
      .chevron {
        transition: none;
      }
      .details {
        animation: none;
      }
    }
  `;
};
X([M({ attribute: !1 })], Q.prototype, "hass", null), X([N()], Q.prototype, "snapshot", null), X([N()], Q.prototype, "error", null), X([N()], Q.prototype, "sessionEntryId", null), X([N()], Q.prototype, "detailsExpanded", null), X([N()], Q.prototype, "now", null), Q = X([Pe("codex-usage-card")], Q);
//#endregion
//#region src/codex-usage-card-editor.ts
var Ft = "https://github.com/LucaFSmart/codex-usage#dashboard-card", It = [
	{
		key: "lifetime_tokens",
		label: "lifetimeTokens"
	},
	{
		key: "total_threads",
		label: "threads"
	},
	{
		key: "peak_daily_tokens",
		label: "peakDailyTokens"
	},
	{
		key: "current_streak_days",
		label: "currentStreak"
	},
	{
		key: "longest_streak_days",
		label: "longestStreak"
	},
	{
		key: "longest_running_turn_sec",
		label: "longestTurn"
	},
	{
		key: "fast_mode_usage_percentage",
		label: "fastMode"
	},
	{
		key: "total_skills_used",
		label: "totalSkills"
	},
	{
		key: "unique_skills_used",
		label: "uniqueSkills"
	},
	{
		key: "most_used_reasoning_effort",
		label: "reasoning"
	},
	{
		key: "most_used_reasoning_effort_percentage",
		label: "reasoningShare"
	}
], Lt = [
	"ok",
	"warning",
	"critical",
	"blocked",
	"unknown"
], Rt = {
	ok: "colorOk",
	warning: "colorWarning",
	critical: "colorCritical",
	blocked: "colorBlocked",
	unknown: "colorUnknown"
}, zt = /^var\((--[\w-]+)\s*,\s*(#[0-9a-fA-F]{6})\)$/i;
function Bt(e, t) {
	let n = e.match(zt);
	return n ? n[2] : /^#[0-9a-fA-F]{6}$/i.test(e) ? e : t;
}
function Vt(e, t) {
	let n = e.match(zt);
	return n ? `var(${n[1]}, ${t})` : t;
}
var $ = class extends j {
	#e = void 0;
	get hass() {
		return this.#e;
	}
	set hass(e) {
		this.#e = e;
	}
	#t = structuredClone(U);
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
		let t = G({
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
		this.config = G(e);
	}
	updated(e) {
		if (!e.has("hass") || !this.hass || this.loadedConnection === this.hass.connection) return;
		let t = this.hass.connection;
		this.loadedConnection = t, et(this.hass).then((e) => {
			this.loadedConnection === t && (this.accounts = e.accounts);
		}).catch(() => {
			this.loadedConnection === t && (this.accounts = [], this.loadedConnection = void 0);
		});
	}
	t(e) {
		return bt(this.hass?.locale?.language ?? this.hass?.language, e);
	}
	setSectionVisibility(e, t) {
		let n = structuredClone(this.config), r = t.target.value;
		n.sections[e].visible = r === "true" || r !== "false" && "auto", this.emitConfig(n);
	}
	toggleValue(e, t) {
		let n = structuredClone(this.config);
		n.sections[e].values[t] = n.sections[e].values[t] === !1, this.emitConfig(n);
	}
	sectionLabel(e) {
		return this.t({
			limits: "sectionLimits",
			additional_limits: "sectionAdditionalLimits",
			resets: "sectionResets",
			pace: "sectionPace",
			account: "sectionAccount",
			credits: "sectionCredits",
			spending: "sectionSpending",
			budget: "budget",
			sources: "sources",
			profile: "sectionProfile",
			footer: "sectionFooter"
		}[e]);
	}
	updateThresholds(e) {
		e.stopPropagation(), this.emitConfig(G({
			...this.config,
			thresholds: e.detail.value
		}));
	}
	updateAppearance(e) {
		e.stopPropagation(), this.emitConfig(G({
			...this.config,
			appearance: e.detail.value
		}));
	}
	colorSwatchValue(e) {
		let t = Bt(V[e], "#000000");
		return Bt(this.config.colors[e], t);
	}
	updateColorSwatch(e, t) {
		let n = t.target.value, r = Vt(this.config.colors[e], n);
		this.emitConfig(G({
			...this.config,
			colors: {
				...this.config.colors,
				[e]: r
			}
		}));
	}
	updateColorText(e, t) {
		let n = t.target.value;
		this.emitConfig(G({
			...this.config,
			colors: {
				...this.config.colors,
				[e]: n
			}
		}));
	}
	computeLabel = (e) => {
		let t = e.name ? {
			title: "cardTitle",
			compact: "compactMode",
			account_mode: "accountMode",
			selected_entry_id: "selectedAccount",
			included_entry_ids: "includedAccounts",
			allow_account_switching: "accountSwitching",
			show_unavailable_limits: "showUnavailable",
			stale_after_minutes: "staleAfter",
			card_radius: "cardRadius",
			spacing: "spacing"
		}[e.name] : void 0;
		return t ? this.t(t) : e.name ?? "";
	};
	computeThresholdLabel = (e) => {
		let t = e.name ? {
			warning: "thresholdWarning",
			critical: "colorCritical"
		}[e.name] : void 0;
		return t ? this.t(t) : e.name ?? "";
	};
	valueOptions(e) {
		if ([
			"limits",
			"additional_limits",
			"resets",
			"pace"
		].includes(e)) {
			let e = /* @__PURE__ */ new Set();
			return this.accounts.flatMap((t) => t.limits.flatMap((n) => e.has(n.id) ? [] : (e.add(n.id), [{
				key: n.id,
				label: `${t.name}: ${n.name}`
			}])));
		}
		return e === "credits" ? [
			{
				key: "balance",
				label: this.t("balance")
			},
			{
				key: "reset_credits",
				label: this.t("resetCredits")
			},
			{
				key: "total_earned",
				label: this.t("totalEarned")
			},
			{
				key: "next_expiry",
				label: this.t("nextExpiry")
			}
		] : e === "spending" ? [
			{
				key: "remaining",
				label: this.t("remaining")
			},
			{
				key: "used",
				label: this.t("used")
			},
			{
				key: "limit",
				label: this.t("limit")
			},
			{
				key: "used_percent",
				label: this.t("usage")
			},
			{
				key: "source",
				label: this.t("source")
			},
			{
				key: "reset",
				label: this.t("resets")
			}
		] : e === "profile" ? It.map((e) => ({
			key: e.key,
			label: this.t(e.label)
		})) : e === "account" ? [
			{
				key: "plan",
				label: this.t("planLabel")
			},
			{
				key: "workspace",
				label: this.t("workspace")
			},
			{
				key: "account_id",
				label: this.t("accountId")
			}
		] : e === "footer" ? [{
			key: "updated",
			label: this.t("updated")
		}, {
			key: "version",
			label: "Version"
		}] : [];
	}
	resetAdvanced() {
		this.emitConfig(G({
			...this.config,
			thresholds: U.thresholds,
			stale_after_minutes: U.stale_after_minutes,
			colors: U.colors,
			appearance: U.appearance
		}));
	}
	render() {
		let e = [
			{
				name: "title",
				selector: { text: {} }
			},
			{
				name: "compact",
				selector: { boolean: {} }
			},
			{
				name: "account_mode",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "auto",
							label: this.t("accountAuto")
						},
						{
							value: "single",
							label: this.t("accountSingle")
						},
						{
							value: "all",
							label: this.t("accountAll")
						}
					]
				} }
			},
			{
				name: "included_entry_ids",
				selector: { select: {
					multiple: !0,
					options: this.accounts.map((e) => ({
						value: e.id,
						label: e.name
					}))
				} }
			},
			...this.config.account_mode === "single" ? [{
				name: "selected_entry_id",
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
				selector: { boolean: {} }
			},
			{
				name: "show_unavailable_limits",
				selector: { boolean: {} }
			},
			{
				name: "stale_after_minutes",
				selector: { number: {
					min: 5,
					max: 1440,
					mode: "box",
					unit_of_measurement: "min"
				} }
			}
		];
		return w`<div class="editor">
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${e}
        .computeLabel=${this.computeLabel}
      ></ha-form>
      <details open>
        <summary>${this.t("sections")}</summary>
        <div class="section-list">
          ${nt.map((e) => w`<div class="section-row">
                <label class="section-toggle"
                  >${this.sectionLabel(e)}
                  <select
                    data-section-key=${e}
                    .value=${String(this.config.sections[e].visible)}
                    @change=${(t) => this.setSectionVisibility(e, t)}
                  >
                    <option value="auto">${this.t("accountAuto")}</option>
                    <option value="true">${this.t("alwaysShow")}</option>
                    <option value="false">${this.t("hide")}</option>
                  </select>
                </label>
                ${this.config.sections[e].visible !== !1 && this.valueOptions(e).length > 0 ? w`<div class="value-toggles">
                        ${this.valueOptions(e).map((t) => w`<label data-value-key=${t.key}
                              ><input
                                type="checkbox"
                                .checked=${this.config.sections[e].values[t.key] !== !1}
                                @change=${() => this.toggleValue(e, t.key)}
                              />${t.label}</label
                            >`)}
                      </div>` : E}
              </div>`)}
        </div>
      </details>
      <details>
        <summary>${this.t("advanced")}</summary>
        <h4>${this.t("thresholds")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.thresholds}
          .schema=${[{
			name: "warning",
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
          .computeLabel=${this.computeThresholdLabel}
          @value-changed=${this.updateThresholds}
        ></ha-form>
        <h4>${this.t("semanticColors")}</h4>
        <div class="color-list">
          ${Lt.map((e) => w`<label class="color-row" data-color-key=${e}>
                <span>${this.t(Rt[e])}</span>
                <input
                  type="color"
                  .value=${this.colorSwatchValue(e)}
                  @input=${(t) => this.updateColorSwatch(e, t)}
                />
                <input
                  type="text"
                  .value=${this.config.colors[e]}
                  @change=${(t) => this.updateColorText(e, t)}
                />
              </label>`)}
        </div>
        <h4>${this.t("appearance")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.appearance}
          .schema=${[{
			name: "card_radius",
			selector: { number: {
				min: 0,
				max: 48,
				mode: "box"
			} }
		}, {
			name: "spacing",
			selector: { number: {
				min: 4,
				max: 32,
				mode: "box"
			} }
		}]}
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateAppearance}
        ></ha-form>
        <button class="reset-button" @click=${this.resetAdvanced}>
          ${this.t("resetDefaults")}
        </button>
        <p><a href=${Ft} target="_blank" rel="noreferrer">${this.t("documentation")}</a></p>
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
    .color-list {
      display: grid;
      gap: 8px;
    }
    .color-row {
      display: grid;
      grid-template-columns: minmax(90px, 1fr) 40px minmax(0, 2fr);
      align-items: center;
      gap: 8px;
    }
    .color-row input[type="color"] {
      width: 40px;
      height: 32px;
      padding: 2px;
    }
    .color-row input[type="text"] {
      min-width: 0;
      box-sizing: border-box;
      padding: 8px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .section-list {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }
    .section-row {
      display: grid;
      gap: 8px;
    }
    .section-toggle {
      font-weight: 600;
    }
    .value-toggles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px 12px;
      padding-inline-start: 24px;
      color: var(--secondary-text-color);
      font-size: 0.88rem;
    }
    label {
      display: flex;
      gap: 8px;
      align-items: center;
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
    @media (max-width: 520px) {
      .value-toggles {
        grid-template-columns: 1fr;
      }
    }
  `;
};
X([M({ attribute: !1 })], $.prototype, "hass", null), X([N()], $.prototype, "config", null), X([N()], $.prototype, "accounts", null), $ = X([Pe("codex-usage-card-editor")], $);
//#endregion
//#region src/index.ts
var Ht = {
	type: "codex-usage-card",
	name: "Codex Usage Card",
	description: "Adaptive multi-account Codex usage overview.",
	preview: !0,
	documentationURL: "https://github.com/LucaFSmart/codex-usage#dashboard-card"
};
window.customCards ??= [], window.customCards.some((e) => e.type === Ht.type) || window.customCards.push(Ht);
//#endregion
