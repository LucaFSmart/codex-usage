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
var g = globalThis, ce = (e) => e, _ = g.trustedTypes, le = _ ? _.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, ue = "$lit$", v = `lit$${Math.random().toFixed(9).slice(2)}$`, de = "?" + v, fe = `<${de}>`, y = document, b = () => y.createComment(""), x = (e) => e === null || typeof e != "object" && typeof e != "function", pe = Array.isArray, me = (e) => pe(e) || typeof e?.[Symbol.iterator] == "function", he = "[ 	\n\f\r]", S = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ge = /-->/g, _e = />/g, C = RegExp(`>|${he}(?:([^\\s"'>=/]+)(${he}*=${he}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), ve = /'/g, ye = /"/g, be = /^(?:script|style|textarea|title)$/i, w = ((e) => (t, ...n) => ({
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
}, O = class e {
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
						ctor: r[1] === "." ? Te : r[1] === "?" ? Ee : r[1] === "@" ? De : j
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
function k(e, t, n = e, r) {
	if (t === T) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = x(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = k(e, i._$AS(e, t.values), i, r)), t;
}
var we = class {
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
				s.type === 2 ? t = new A(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Oe(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = D.nextNode(), a++);
		}
		return D.currentNode = y, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, A = class e {
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
		e = k(this, e, t), x(e) ? e === E || e == null || e === "" ? (this._$AH !== E && this._$AR(), this._$AH = E) : e !== this._$AH && e !== T && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? me(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
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
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = O.createElement(Se(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new we(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = xe.get(e.strings);
		return t === void 0 && xe.set(e.strings, t = new O(e)), t;
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
}, j = class {
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
		if (i === void 0) e = k(this, e, t, 0), a = !x(e) || e !== this._$AH && e !== T, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = k(this, r[n + o], t, o), s === T && (s = this._$AH[o]), a ||= !x(s) || s !== this._$AH[o], s === E ? e = E : e !== E && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === E ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Te = class extends j {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === E ? void 0 : e;
	}
}, Ee = class extends j {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== E);
	}
}, De = class extends j {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = k(this, e, t, 0) ?? E) === T) return;
		let n = this._$AH, r = e === E && n !== E || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== E && (n === E || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Oe = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		k(this, e);
	}
}, ke = g.litHtmlPolyfillSupport;
ke?.(O, A), (g.litHtmlVersions ??= []).push("3.3.3");
var Ae = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new A(t.insertBefore(b(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, M = globalThis, N = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ae(t, this.renderRoot, this.renderOptions);
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
N._$litElement$ = !0, N.finalized = !0, M.litElementHydrateSupport?.({ LitElement: N });
var je = M.litElementPolyfillSupport;
je?.({ LitElement: N }), (M.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region node_modules/@lit/reactive-element/decorators/custom-element.js
var Me = (e) => (t, n) => {
	n === void 0 ? customElements.define(e, t) : n.addInitializer(() => {
		customElements.define(e, t);
	});
}, Ne = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	hasChanged: oe
}, Pe = (e = Ne, t, n) => {
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
function P(e) {
	return (t, n) => typeof n == "object" ? Pe(e, t, n) : ((e, t, n) => {
		let r = t.hasOwnProperty(n);
		return t.constructor.createProperty(n, e), r ? Object.getOwnPropertyDescriptor(t, n) : void 0;
	})(e, t, n);
}
//#endregion
//#region node_modules/@lit/reactive-element/decorators/state.js
function F(e) {
	return P({
		...e,
		state: !0,
		attribute: !1
	});
}
//#endregion
//#region src/card-data.ts
var Fe = [
	"spend",
	"credits",
	"usage_limit",
	"unknown",
	null
], Ie = [
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
], Le = /* @__PURE__ */ new Set(["fast_mode_usage_percentage", "most_used_reasoning_effort_percentage"]);
function I(e) {
	return typeof e == "object" && e && !Array.isArray(e) ? e : null;
}
function L(e) {
	return typeof e == "string" && e.trim() ? e.trim() : null;
}
function R(e) {
	let t = L(e);
	return t && Number.isFinite(Date.parse(t)) ? t : null;
}
function z(e) {
	return typeof e == "number" && Number.isFinite(e) && e >= 0 && e <= 100 ? e : null;
}
function B(e) {
	return typeof e == "number" && Number.isInteger(e) && e >= 0 ? e : null;
}
function V(e) {
	return typeof e == "boolean" ? e : null;
}
function Re(e) {
	let t = L(e);
	return t && /^(sensor|binary_sensor)\.[a-z0-9_]+$/.test(t) ? t : null;
}
function ze(e) {
	let t = I(e);
	if (!t) return null;
	let n = L(t.id), r = L(t.name);
	if (!n || !r || t.source !== "main" && t.source !== "additional") return null;
	let i = z(t.used_percent), a = z(t.remaining_percent);
	return {
		id: n,
		name: r,
		source: t.source,
		duration_seconds: typeof t.duration_seconds == "number" && Number.isFinite(t.duration_seconds) && t.duration_seconds > 0 ? t.duration_seconds : null,
		used_percent: i,
		remaining_percent: a,
		resets_at: R(t.resets_at),
		reached: t.reached === !0,
		entity_id: Re(t.entity_id)
	};
}
function Be(e) {
	let t = I(e);
	return t ? {
		balance: L(t.balance),
		has_credits: V(t.has_credits),
		unlimited: V(t.unlimited),
		overage_reached: V(t.overage_reached)
	} : null;
}
function Ve(e) {
	let t = I(e);
	return t ? {
		source: L(t.source),
		limit: L(t.limit),
		used: L(t.used),
		remaining: L(t.remaining),
		used_percent: z(t.used_percent),
		remaining_percent: z(t.remaining_percent),
		resets_at: R(t.resets_at),
		reached: V(t.reached)
	} : null;
}
function He(e) {
	let t = I(e);
	if (!t) return null;
	let n = [];
	for (let e of Ie) {
		if (!Object.hasOwn(t, e)) continue;
		let r = t[e];
		if (r === null) {
			n.push([e, null]);
			continue;
		}
		if (e === "most_used_reasoning_effort") {
			let t = L(r);
			t !== null && n.push([e, t]);
			continue;
		}
		let i = Le.has(e) ? z(r) : B(r);
		i !== null && n.push([e, i]);
	}
	return Object.fromEntries(n);
}
function Ue(e) {
	let t = I(e);
	if (!t) return null;
	let n = L(t.id), r = L(t.name);
	if (!n || !r || !Array.isArray(t.limits)) return null;
	let i = Fe.includes(t.blocker) ? t.blocker : "unknown", a = I(t.reset_credits);
	return {
		id: n,
		name: r,
		plan: L(t.plan),
		available: t.available === !0,
		updated_at: R(t.updated_at),
		blocker: i,
		limits: t.limits.map(ze).filter((e) => e !== null),
		credits: Be(t.credits),
		spend: Ve(t.spend),
		reset_credits: a ? {
			available_count: B(a.available_count),
			total_earned: B(a.total_earned),
			next_expiry: R(a.next_expiry)
		} : null,
		profile: He(t.profile)
	};
}
function We(e) {
	let t = I(e);
	if (!t || t.schema_version !== 1 || !Array.isArray(t.accounts)) throw Error("Unsupported Codex Usage card data");
	let n = L(t.integration_version), r = R(t.generated_at);
	if (!n || !r) throw Error("Incomplete Codex Usage card data");
	return {
		schema_version: 1,
		integration_version: n,
		generated_at: r,
		accounts: t.accounts.map(Ue).filter((e) => e !== null)
	};
}
async function Ge(e) {
	return We(await e.callWS({ type: "codex_usage/card_data" }));
}
//#endregion
//#region src/config.ts
var Ke = [
	"auto",
	"single",
	"all"
], qe = [
	"adaptive",
	"compact",
	"detailed"
], Je = [
	"limits",
	"resets",
	"pace",
	"credits",
	"spending",
	"profile",
	"footer"
], Ye = [
	"missing",
	"stale",
	"normal",
	"elevated",
	"critical",
	"blocked"
], H = {
	elevated: 60,
	critical: 85
}, Xe = {
	normal: "var(--codex-usage-normal-color, #25b7f3)",
	elevated: "var(--codex-usage-elevated-color, #ffb74d)",
	critical: "var(--codex-usage-critical-color, #ff5f6d)",
	blocked: "var(--codex-usage-blocked-color, #d32f49)",
	stale: "var(--codex-usage-stale-color, #78909c)",
	missing: "var(--codex-usage-missing-color, #9e9e9e)"
}, U = (e = !0) => ({
	visible: e,
	values: {}
}), W = {
	type: "custom:codex-usage-card",
	account_mode: "auto",
	included_entry_ids: [],
	allow_account_switching: !0,
	display_mode: "adaptive",
	title: "Codex Usage",
	show_unavailable_limits: !1,
	sections: {
		limits: U(),
		resets: U(),
		pace: U(),
		credits: U(),
		spending: U(),
		profile: U(),
		footer: U()
	},
	thresholds: { ...H },
	colors: { ...Xe },
	stale_after_minutes: 15,
	appearance: {
		card_radius: 20,
		panel_radius: 14,
		spacing: 16
	}
};
function G(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Ze(e) {
	if (!G(e)) return {};
	try {
		return structuredClone(e);
	} catch {
		return {};
	}
}
function Qe(e, t) {
	return typeof e == "string" && t.includes(e);
}
function $e(e) {
	if (typeof e == "string") return e.trim() || void 0;
}
function et(e) {
	return Array.isArray(e) ? [...new Set(e.map($e).filter((e) => !!e))] : [];
}
function tt(e) {
	let t = G(e) ? e : {};
	return Object.fromEntries(Je.map((e) => {
		let n = G(t[e]) ? t[e] : {}, r = G(n.values) ? Object.fromEntries(Object.entries(n.values).filter(([, e]) => typeof e == "boolean")) : {};
		return [e, {
			visible: typeof n.visible == "boolean" ? n.visible : W.sections[e].visible,
			values: r
		}];
	}));
}
function nt(e) {
	if (!G(e)) return { ...H };
	let t = e.elevated, n = e.critical;
	return typeof t == "number" && Number.isFinite(t) && typeof n == "number" && Number.isFinite(n) && t >= 0 && t < n && n <= 100 ? {
		elevated: t,
		critical: n
	} : { ...H };
}
function rt(e) {
	if (typeof e != "string" || !e.trim()) return !1;
	if (typeof CSS > "u" || typeof CSS.supports != "function") return !0;
	try {
		return CSS.supports("color", e);
	} catch {
		return !1;
	}
}
function it(e) {
	let t = G(e) ? e : {};
	return Object.fromEntries(Ye.map((e) => [e, rt(t[e]) ? t[e].trim() : Xe[e]]));
}
function at(e, t, n, r) {
	return typeof e == "number" && Number.isFinite(e) && e >= n && e <= r ? e : t;
}
function ot(e) {
	let t = G(e) ? e : {};
	return {
		card_radius: at(t.card_radius, W.appearance.card_radius, 0, 48),
		panel_radius: at(t.panel_radius, W.appearance.panel_radius, 0, 36),
		spacing: at(t.spacing, W.appearance.spacing, 4, 32)
	};
}
function K(e) {
	let t = Ze(e), n = {
		type: typeof t.type == "string" ? t.type : W.type,
		account_mode: Qe(t.account_mode, Ke) ? t.account_mode : W.account_mode,
		included_entry_ids: et(t.included_entry_ids),
		allow_account_switching: typeof t.allow_account_switching == "boolean" ? t.allow_account_switching : W.allow_account_switching,
		display_mode: Qe(t.display_mode, qe) ? t.display_mode : W.display_mode,
		title: typeof t.title == "string" ? t.title : W.title,
		show_unavailable_limits: typeof t.show_unavailable_limits == "boolean" ? t.show_unavailable_limits : W.show_unavailable_limits,
		sections: tt(t.sections),
		thresholds: nt(t.thresholds),
		colors: it(t.colors),
		stale_after_minutes: typeof t.stale_after_minutes == "number" && Number.isFinite(t.stale_after_minutes) && t.stale_after_minutes >= 5 && t.stale_after_minutes <= 1440 ? t.stale_after_minutes : W.stale_after_minutes,
		appearance: ot(t.appearance)
	}, r = $e(t.selected_entry_id);
	r && (n.selected_entry_id = r);
	for (let e of [
		"view_layout",
		"layout_options",
		"grid_options"
	]) G(t[e]) && (n[e] = t[e]);
	return Array.isArray(t.visibility) && (n.visibility = structuredClone(t.visibility)), n;
}
//#endregion
//#region src/format.ts
var st = {
	guest: "Guest",
	free: "Free",
	go: "Go",
	plus: "Plus",
	pro: "Pro",
	prolite: "Pro Lite",
	free_workspace: "Free Workspace",
	team: "Team",
	self_serve_business_usage_based: "Usage-based Business",
	business: "Business",
	enterprise_cbp_usage_based: "Usage-based Enterprise",
	education: "Education",
	quorum: "Quorum",
	k12: "K–12",
	enterprise: "Enterprise",
	edu: "Edu",
	unknown: "Unknown plan"
};
function ct(e) {
	if (!e) return "";
	let t = e.trim().toLowerCase();
	return st[t] ? st[t] : lt(t);
}
function lt(e) {
	return e.trim().toLowerCase().split(/[_-]+/u).filter(Boolean).map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
}
function q(e, t, n = !1) {
	return e === null || !Number.isFinite(e) ? "—" : new Intl.NumberFormat(t, {
		notation: n ? "compact" : "standard",
		maximumFractionDigits: n ? 2 : 1
	}).format(e);
}
function J(e, t) {
	if (e === null) return "—";
	let n = Number(e);
	return Number.isFinite(n) ? new Intl.NumberFormat(t, { maximumFractionDigits: 2 }).format(n) : e;
}
//#endregion
//#region src/localize.ts
var ut = {
	en: {
		available: "Available",
		elevatedStatus: "Elevated",
		criticalStatus: "Critical",
		blocked: "Blocked",
		stale: "Out of date",
		unavailable: "Unavailable",
		remaining: "remaining",
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
		blockerSpend: "Spending limit reached",
		blockerCredits: "Credit limit reached",
		blockerUsage: "Usage limit reached",
		blockerUnknown: "Access currently blocked",
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
		displayMode: "Display mode",
		displayAdaptive: "Adaptive",
		displayCompact: "Compact",
		displayDetailed: "Detailed",
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
		colorNormal: "Normal",
		colorElevated: "Elevated",
		colorCritical: "Critical",
		colorBlocked: "Blocked",
		colorStale: "Out of date",
		colorMissing: "Unavailable",
		cardRadius: "Card radius",
		panelRadius: "Panel radius",
		spacing: "Spacing",
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
		elevatedStatus: "Erhöht",
		criticalStatus: "Kritisch",
		blocked: "Blockiert",
		stale: "Veraltet",
		unavailable: "Nicht verfügbar",
		remaining: "verbleibend",
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
		blockerSpend: "Ausgabenlimit erreicht",
		blockerCredits: "Guthabenlimit erreicht",
		blockerUsage: "Nutzungslimit erreicht",
		blockerUnknown: "Zugriff derzeit blockiert",
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
		displayMode: "Anzeigemodus",
		displayAdaptive: "Adaptiv",
		displayCompact: "Kompakt",
		displayDetailed: "Detailliert",
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
		colorNormal: "Normal",
		colorElevated: "Erhöht",
		colorCritical: "Kritisch",
		colorBlocked: "Blockiert",
		colorStale: "Veraltet",
		colorMissing: "Nicht verfügbar",
		cardRadius: "Kartenradius",
		panelRadius: "Panelradius",
		spacing: "Abstand",
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
function dt(e, t) {
	return ut[e?.toLowerCase().startsWith("de") ? "de" : "en"][t];
}
//#endregion
//#region src/status.ts
var ft = {
	missing: 0,
	normal: 1,
	stale: 2,
	elevated: 3,
	critical: 4,
	blocked: 5
};
function pt(e, t, n) {
	return t ? "blocked" : typeof e != "number" || !Number.isFinite(e) ? "missing" : e >= n.critical ? "critical" : e >= n.elevated ? "elevated" : "normal";
}
function mt(e) {
	return e.reduce((e, t) => ft[t] > ft[e] ? t : e, "missing");
}
//#endregion
//#region src/view-model.ts
function ht(e) {
	if (!e) return null;
	let t = new Date(e);
	return Number.isFinite(t.getTime()) ? t : null;
}
function gt(e, t, n) {
	let r = ht(e);
	return r === null || n.getTime() - r.getTime() > t * 6e4;
}
function _t(e, t) {
	if (!e.duration_seconds || !e.resets_at || e.used_percent === null) return null;
	let n = ht(e.resets_at);
	if (!n) return null;
	let r = n.getTime() - e.duration_seconds * 1e3, i = (t.getTime() - r) / (e.duration_seconds * 1e3) * 100;
	return !Number.isFinite(i) || i < 0 || i > 100 ? null : e.used_percent - i;
}
function vt(e, t, n) {
	let r = !e.available || gt(e.updated_at, t.stale_after_minutes, n), i = e.limits.map((r) => ({
		...r,
		severity: pt(r.used_percent, r.reached || e.blocker !== null, t.thresholds),
		pace: _t(r, n)
	})), a = e.blocker === null ? mt(i.map((e) => e.severity)) : "blocked";
	return e.blocker === null && r && a !== "missing" && (a = "stale"), {
		...e,
		limits: i,
		severity: a,
		stale: r
	};
}
function yt(e, t, n, r = /* @__PURE__ */ new Date()) {
	let i = e.accounts;
	t.included_entry_ids.length > 0 && (i = i.filter((e) => t.included_entry_ids.includes(e.id)));
	let a = i.map((e) => vt(e, t, r)), o = n ?? t.selected_entry_id, s = o ? a.find((e) => e.id === o) ?? null : null;
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
		severity: t.account_mode === "single" && s ? s.severity : mt(a.map((e) => e.severity)),
		generatedAt: ht(e.generated_at),
		integrationVersion: e.integration_version
	};
}
//#endregion
//#region \0@oxc-project+runtime@0.139.0/helpers/esm/decorate.js
function Y(e, t, n, r) {
	var i = arguments.length, a = i < 3 ? t : r === null ? r = Object.getOwnPropertyDescriptor(t, n) : r, o;
	if (typeof Reflect == "object" && typeof Reflect.decorate == "function") a = Reflect.decorate(e, t, n, r);
	else for (var s = e.length - 1; s >= 0; s--) (o = e[s]) && (a = (i < 3 ? o(a) : i > 3 ? o(t, n, a) : o(t, n)) || a);
	return i > 3 && a && Object.defineProperty(t, n, a), a;
}
//#endregion
//#region src/codex-usage-card.ts
var bt = "codex_usage_card_data_updated", xt = "https://github.com/LucaFSmart/codex-usage#dashboard-card", X = [
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
];
function Z(e, t) {
	return e === null ? "—" : `${new Intl.NumberFormat(t, { maximumFractionDigits: 1 }).format(e)}%`;
}
var Q = class extends N {
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
	config = structuredClone(W);
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
		this.config = K(e), this.sessionEntryId = void 0, this.requestUpdate();
	}
	getGridOptions() {
		return {
			columns: 6,
			min_columns: 3,
			max_columns: 12
		};
	}
	getCardSize() {
		return this.config.display_mode === "compact" ? 3 : this.config.display_mode === "detailed" ? 7 : 5;
	}
	updated(e) {
		e.has("hass") && this.hass && this.startClient().catch(() => {
			this.error = !0;
		});
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribe?.(), this.unsubscribe = void 0, this.subscribedConnection = void 0;
	}
	async startClient() {
		if (!this.hass) return;
		let e = this.subscribedConnection !== this.hass.connection || !this.snapshot;
		if (this.subscribedConnection !== this.hass.connection) {
			this.unsubscribe?.(), this.subscribedConnection = this.hass.connection;
			try {
				this.unsubscribe = await this.hass.connection.subscribeEvents(() => void this.loadSnapshot(), bt);
			} catch {
				this.error = !0, this.subscribedConnection = void 0;
			}
		}
		e && await this.loadSnapshot();
	}
	async loadSnapshot() {
		if (!(!this.hass || this.loading)) {
			this.loading = !0;
			try {
				this.snapshot = await Ge(this.hass), this.error = !1;
			} catch {
				this.error = !0;
			} finally {
				this.loading = !1;
			}
		}
	}
	t(e) {
		return dt(this.hass?.locale?.language ?? this.hass?.language, e);
	}
	get locale() {
		return this.hass?.locale?.language ?? this.hass?.language;
	}
	statusLabel(e) {
		return e === "blocked" ? this.t("blocked") : e === "stale" ? this.t("stale") : e === "missing" ? this.t("unavailable") : e === "critical" ? this.t("criticalStatus") : e === "elevated" ? this.t("elevatedStatus") : this.t("available");
	}
	blockerLabel(e) {
		return e === "spend" ? this.t("blockerSpend") : e === "credits" ? this.t("blockerCredits") : e === "usage_limit" ? this.t("blockerUsage") : this.t("blockerUnknown");
	}
	limitLabel(e) {
		let t = (t) => e.duration_seconds !== null && e.duration_seconds >= t * .95 && e.duration_seconds <= t * 1.05;
		return t(18e3) ? this.t("fiveHours") : t(604800) ? this.t("week") : e.duration_seconds && e.duration_seconds % 86400 == 0 ? `${e.duration_seconds / 86400} ${this.t("days")}` : e.name || this.t("unknownWindow");
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
	valueVisible(e, t) {
		return this.config.sections[e].values[t] !== !1;
	}
	renderLimit(e, t) {
		let n = e.used_percent ?? (e.remaining_percent === null ? null : 100 - e.remaining_percent), r = e.remaining_percent ?? (n === null ? null : 100 - n), i = w` <div class="limit-head">
        <span>${this.limitLabel(e)}</span>
        ${this.config.sections.resets.visible && this.valueVisible("resets", e.id) && e.resets_at ? w`<span class="reset"
                >${this.t("resets")}: ${this.resetLabel(e.resets_at)}</span
              >` : E}
      </div>
      <div class="limit-content">
        ${t ? w`<div class="ring" style=${`--progress:${n ?? 0}`} aria-hidden="true">
                <strong>${Z(n, this.locale)}</strong>
              </div>` : w`<strong class="limit-value">${Z(n, this.locale)}</strong>`}
        <div class="limit-copy">
          <strong>${Z(r, this.locale)} ${this.t("remaining")}</strong>
          <div
            class="bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow=${n ?? 0}
          >
            <span style=${`width:${n ?? 0}%`}></span>
          </div>
          ${this.config.sections.pace.visible && this.valueVisible("pace", e.id) && e.pace !== null ? w`<small
                  >${this.t("pace")}: ${q(Math.abs(e.pace), this.locale)}
                  ${this.t("percentagePoints")}
                  ${e.pace >= 0 ? this.t("ahead") : this.t("behind")}</small
                >` : E}
        </div>
      </div>`;
		return e.entity_id ? w`<button class="limit-panel panel" @click=${() => this.openMoreInfo(e.entity_id)}>
          ${i}
        </button>` : w`<div class="limit-panel panel">${i}</div>`;
	}
	renderDetails(e) {
		if (this.config.display_mode === "compact") return E;
		let t = [], n = this.config.display_mode === "detailed", r = this.valueVisible("credits", "balance"), i = n && this.valueVisible("credits", "state");
		if (this.config.sections.credits.visible && e.credits && (r || i)) {
			let n = e.credits.unlimited ? this.t("unlimited") : e.credits.has_credits ? this.t("available") : this.t("unavailable");
			t.push(w`<div class="detail panel" data-detail="credits">
          <span>${this.t("credits")}</span
          ><strong data-credit-key=${r ? "balance" : "state"}
            >${r ? e.credits.unlimited ? "∞" : J(e.credits.balance, this.locale) : n}</strong
          >
          ${i && r ? w`<small data-credit-key="state">${this.t("creditState")}: ${n}</small>` : E}
        </div>`);
		}
		let a = this.valueVisible("credits", "reset_credits"), o = n && (this.valueVisible("credits", "total_earned") || this.valueVisible("credits", "next_expiry"));
		if (this.config.sections.credits.visible && e.reset_credits && (a || o) && t.push(w`<div class="detail panel" data-detail="reset-credits">
          <span>${this.t("resetCredits")}</span>
          <strong
            >${a ? q(e.reset_credits.available_count, this.locale) : "—"}</strong
          >
          ${n ? w`<div class="metrics">
                  ${this.valueVisible("credits", "total_earned") ? w`<small data-credit-key="total_earned"
                          >${this.t("totalEarned")}:
                          ${q(e.reset_credits.total_earned, this.locale)}</small
                        >` : E}
                  ${this.valueVisible("credits", "next_expiry") && e.reset_credits.next_expiry ? w`<small data-credit-key="next_expiry"
                          >${this.t("nextExpiry")}:
                          ${this.resetLabel(e.reset_credits.next_expiry)}</small
                        >` : E}
                </div>` : E}
        </div>`), this.config.sections.spending.visible && e.spend) {
			let r = [
				["remaining", e.spend.remaining],
				["limit", e.spend.limit],
				["used", e.spend.used],
				["used_percent", e.spend.used_percent]
			].find(([e, t]) => this.valueVisible("spending", e) && t !== null), i = n && [
				"used",
				"limit",
				"used_percent",
				"source",
				"reset"
			].some((e) => this.valueVisible("spending", e));
			if (r || i) {
				let [i, a] = r ?? ["remaining", null];
				t.push(w`<div class="detail panel" data-detail="spending">
            <span>${this.t("spending")}</span
            ><strong data-spend-key=${i}
              >${i === "used_percent" ? Z(a, this.locale) : J(a, this.locale)}</strong
            >
            ${n ? w`<div class="metrics">
                    ${this.valueVisible("spending", "used") ? w`<small data-spend-key="used"
                            >${this.t("used")}:
                            ${J(e.spend.used, this.locale)}</small
                          >` : E}
                    ${this.valueVisible("spending", "limit") ? w`<small data-spend-key="limit"
                            >${this.t("limit")}:
                            ${J(e.spend.limit, this.locale)}</small
                          >` : E}
                    ${this.valueVisible("spending", "used_percent") ? w`<small data-spend-key="used_percent"
                            >${this.t("usage")}:
                            ${Z(e.spend.used_percent, this.locale)}</small
                          >` : E}
                    ${this.valueVisible("spending", "source") && e.spend.source ? w`<small data-spend-key="source"
                            >${this.t("source")}: ${e.spend.source}</small
                          >` : E}
                    ${this.valueVisible("spending", "reset") && e.spend.resets_at ? w`<small data-spend-key="reset"
                            >${this.t("resets")}: ${this.resetLabel(e.spend.resets_at)}</small
                          >` : E}
                  </div>` : this.valueVisible("spending", "used_percent") && e.spend.used_percent !== null ? w`<small
                      >${Z(e.spend.used_percent, this.locale)}
                      ${this.t("used")}</small
                    >` : E}
          </div>`);
			}
		}
		if (this.config.sections.profile.visible && e.profile) {
			let n = this.config.display_mode === "detailed" ? X : X.filter((e) => ["lifetime_tokens", "total_threads"].includes(e.key));
			t.push(w`<div class="detail profile panel">
          <span>${this.t("profile")}</span>
          <div class="profile-metrics">
            ${n.map((t) => {
				if (!this.valueVisible("profile", t.key)) return E;
				let n = e.profile?.[t.key];
				if (n == null) return E;
				let r = typeof n == "number" ? t.key === "fast_mode_usage_percentage" || t.key === "most_used_reasoning_effort_percentage" ? Z(n, this.locale) : q(n, this.locale, t.compact) : lt(n);
				return w`<div class="profile-value" data-profile-key=${t.key}>
                <strong>${r}${t.suffix ? ` ${this.t(t.suffix)}` : ""}</strong>
                <small>${this.t(t.label)}</small>
              </div>`;
			})}
          </div>
        </div>`);
		}
		return t.length ? w`<div class="details">${t}</div>` : E;
	}
	render() {
		let e = this.snapshot ? yt(this.snapshot, this.config, this.sessionEntryId) : null, t = e?.selectedAccount ?? null, n = this.error && this.snapshot ? "stale" : e?.severity ?? "missing", r = !!(e && e.accounts.length > 1) && this.config.account_mode !== "single", i = ct(t?.plan ?? null), a = t ? r ? `${t.name}${i ? ` · ${i}` : ""}` : i : "", o = t?.limits.filter((e) => this.config.sections.limits.values[e.id] !== !1 && (this.config.show_unavailable_limits || e.used_percent !== null || e.remaining_percent !== null)) ?? [];
		return w`<ha-card class=${n} style=${`--state-color:${this.config.colors[n]};--card-radius:${this.config.appearance.card_radius}px;--panel-radius:${this.config.appearance.panel_radius}px;--card-spacing:${this.config.appearance.spacing}px`}>
      <div class="surface">
        <header>
          <div>
            <h2>${this.config.title}</h2>
            ${a ? w`<p>${a}</p>` : E}
          </div>
          <span class="status"
            ><i></i>${r ? `${this.t("overall")} · ` : ""}${this.statusLabel(n)}</span
          >
        </header>
        ${r && e && this.config.allow_account_switching ? w`<nav aria-label=${this.t("account")}>
                ${e.accounts.map((e) => w`<button
                      class="account-chip ${e.id === t?.id ? "selected" : ""}"
                      data-entry-id=${e.id}
                      @click=${() => this.sessionEntryId = e.id}
                    >
                      <i style=${`--chip-color:${this.config.colors[e.severity]}`}></i
                      >${e.name}
                    </button>`)}
              </nav>` : E}
        ${t?.blocker ? w`<div class="blocker-note">${this.blockerLabel(t.blocker)}</div>` : E}
        ${t ? this.config.sections.limits.visible ? o.length ? w`<main class="limits">
                    ${o.map((e, t) => this.renderLimit(e, t === 0 && this.config.display_mode !== "compact"))}
                  </main>` : w`<div class="empty">
                    ${this.error ? this.t("unavailable") : this.t("noData")}
                  </div>` : E : w`<div class="empty">${this.t("unavailable")}</div>`}
        ${t ? this.renderDetails(t) : E}
        ${t && this.config.sections.footer.visible ? w`<footer>
                ${this.valueVisible("footer", "updated") ? w`<span
                        >${this.t("updated")}: ${this.resetLabel(t.updated_at)}</span
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
    .blocker-note {
      margin: 0 0 12px;
      padding: 9px 11px;
      border-radius: calc(var(--codex-usage-panel-radius, var(--panel-radius)) * 0.7);
      border: 1px solid color-mix(in srgb, var(--state-color) 55%, transparent);
      background: color-mix(in srgb, var(--state-color) 11%, transparent);
      color: var(--state-color);
      font-size: 0.78rem;
      font-weight: 650;
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
    .metrics {
      display: grid;
      gap: 3px;
      margin-top: 4px;
    }
    .profile {
      grid-column: 1 / -1;
    }
    .profile-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin-top: 5px;
    }
    .profile-value {
      display: grid;
      gap: 2px;
      padding: 9px;
      border-radius: calc(var(--codex-usage-panel-radius, var(--panel-radius)) * 0.65);
      background: color-mix(in srgb, var(--primary-background-color) 48%, transparent);
    }
    .profile-value strong {
      overflow-wrap: anywhere;
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
Y([P({ attribute: !1 })], Q.prototype, "hass", null), Y([F()], Q.prototype, "snapshot", null), Y([F()], Q.prototype, "error", null), Y([F()], Q.prototype, "sessionEntryId", null), Q = Y([Me("codex-usage-card")], Q);
var $ = class extends N {
	#e = void 0;
	get hass() {
		return this.#e;
	}
	set hass(e) {
		this.#e = e;
	}
	#t = structuredClone(W);
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
		let t = K({
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
		this.config = K(e);
	}
	updated(e) {
		!e.has("hass") || !this.hass || this.loadedConnection === this.hass.connection || (this.loadedConnection = this.hass.connection, Ge(this.hass).then((e) => {
			this.accounts = e.accounts;
		}).catch(() => {
			this.accounts = [];
		}));
	}
	t(e) {
		return dt(this.hass?.locale?.language ?? this.hass?.language, e);
	}
	toggleSection(e) {
		let t = structuredClone(this.config);
		t.sections[e].visible = !t.sections[e].visible, this.emitConfig(t);
	}
	toggleValue(e, t) {
		let n = structuredClone(this.config);
		n.sections[e].values[t] = n.sections[e].values[t] === !1, this.emitConfig(n);
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
		e.stopPropagation(), this.emitConfig(K({
			...this.config,
			thresholds: e.detail.value
		}));
	}
	updateAppearance(e) {
		e.stopPropagation(), this.emitConfig(K({
			...this.config,
			appearance: e.detail.value
		}));
	}
	updateColors(e) {
		e.stopPropagation(), this.emitConfig(K({
			...this.config,
			colors: e.detail.value
		}));
	}
	computeLabel = (e) => {
		let t = {
			title: "cardTitle",
			display_mode: "displayMode",
			account_mode: "accountMode",
			selected_entry_id: "selectedAccount",
			included_entry_ids: "includedAccounts",
			allow_account_switching: "accountSwitching",
			show_unavailable_limits: "showUnavailable",
			stale_after_minutes: "staleAfter",
			elevated: "elevatedStatus",
			critical: "criticalStatus",
			normal: "colorNormal",
			blocked: "colorBlocked",
			stale: "colorStale",
			missing: "colorMissing",
			card_radius: "cardRadius",
			panel_radius: "panelRadius",
			spacing: "spacing"
		};
		if (e.name === "critical") return this.t("colorCritical");
		let n = e.name ? t[e.name] : void 0;
		return n ? this.t(n) : e.name ?? "";
	};
	valueOptions(e) {
		if ([
			"limits",
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
				key: "state",
				label: this.t("creditState")
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
		] : e === "profile" ? X.map((e) => ({
			key: e.key,
			label: this.t(e.label)
		})) : e === "footer" ? [{
			key: "updated",
			label: this.t("updated")
		}, {
			key: "version",
			label: "Version"
		}] : [];
	}
	resetAdvanced() {
		this.emitConfig(K({
			...this.config,
			thresholds: W.thresholds,
			stale_after_minutes: W.stale_after_minutes,
			colors: W.colors,
			appearance: W.appearance
		}));
	}
	render() {
		let e = [
			{
				name: "title",
				selector: { text: {} }
			},
			{
				name: "display_mode",
				selector: { select: {
					mode: "dropdown",
					options: [
						{
							value: "adaptive",
							label: this.t("displayAdaptive")
						},
						{
							value: "compact",
							label: this.t("displayCompact")
						},
						{
							value: "detailed",
							label: this.t("displayDetailed")
						}
					]
				} }
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
          ${Je.map((e) => w`<div class="section-row">
                <label class="section-toggle"
                  ><input
                    type="checkbox"
                    .checked=${this.config.sections[e].visible}
                    @change=${() => this.toggleSection(e)}
                  />${this.sectionLabel(e)}</label
                >
                ${this.config.sections[e].visible && this.valueOptions(e).length > 0 ? w`<div class="value-toggles">
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
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateThresholds}
        ></ha-form>
        <h4>${this.t("semanticColors")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.colors}
          .schema=${[
			{
				name: "normal",
				selector: { text: {} }
			},
			{
				name: "elevated",
				selector: { text: {} }
			},
			{
				name: "critical",
				selector: { text: {} }
			},
			{
				name: "blocked",
				selector: { text: {} }
			},
			{
				name: "stale",
				selector: { text: {} }
			},
			{
				name: "missing",
				selector: { text: {} }
			}
		]}
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateColors}
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
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateAppearance}
        ></ha-form>
        <button class="reset-button" @click=${this.resetAdvanced}>
          ${this.t("resetDefaults")}
        </button>
        <p><a href=${xt} target="_blank" rel="noreferrer">${this.t("documentation")}</a></p>
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
Y([P({ attribute: !1 })], $.prototype, "hass", null), Y([F()], $.prototype, "config", null), Y([F()], $.prototype, "accounts", null), $ = Y([Me("codex-usage-card-editor")], $);
//#endregion
//#region src/index.ts
var St = {
	type: "codex-usage-card",
	name: "Codex Usage Card",
	description: "Adaptive multi-account Codex usage overview.",
	preview: !0,
	documentationURL: "https://github.com/LucaFSmart/codex-usage#dashboard-card"
};
window.customCards ??= [], window.customCards.some((e) => e.type === St.type) || window.customCards.push(St);
//#endregion
