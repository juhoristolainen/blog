
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.34.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const kayttaja = writable({ ktun: 'Juho', salasana: 1234 });

    //Apuna käytetty https://svelte.dev/tutorial/readable-stores

    const pvm = readable(new Date(), function start(set) {
      const interval = setInterval(() => {
        set(new Date());
      }, 1000);

      return function stop() {
        clearInterval(interval);
      };
    });

    /* src\TopBar.svelte generated by Svelte v3.34.0 */
    const file = "src\\TopBar.svelte";

    // (58:0) {:else}
    function create_else_block(ctx) {
    	let div1;
    	let button0;
    	let t1;
    	let div0;
    	let h2;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Uusi postaus";
    			t1 = space();
    			div0 = element("div");
    			h2 = element("h2");
    			t2 = text("Moikka ");
    			t3 = text(/*nimi*/ ctx[1]);
    			t4 = text("!");
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "Kirjaudu ulos!";
    			attr_dev(button0, "class", "uusipostaus svelte-h0yz13");
    			add_location(button0, file, 59, 2, 1463);
    			add_location(h2, file, 61, 4, 1587);
    			attr_dev(div0, "class", "tervehdys svelte-h0yz13");
    			add_location(div0, file, 60, 2, 1558);
    			attr_dev(button1, "class", "kirjauduUlos svelte-h0yz13");
    			add_location(button1, file, 63, 0, 1622);
    			attr_dev(div1, "class", "kirjautunut svelte-h0yz13");
    			add_location(div1, file, 58, 0, 1434);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			append_dev(h2, t4);
    			append_dev(div1, t5);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[11], false, false, false),
    					listen_dev(button1, "click", /*kirjauduUlos*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*nimi*/ 2) set_data_dev(t3, /*nimi*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(58:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (47:2) {#if !kirjautunut}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block = /*vaaratunnus*/ ctx[3] && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			label0 = element("label");
    			label0.textContent = "Nimi";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			label1 = element("label");
    			label1.textContent = "Salasana";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Kirjaudu sisään!";
    			attr_dev(label0, "for", "nimi");
    			attr_dev(label0, "class", "svelte-h0yz13");
    			add_location(label0, file, 51, 2, 1170);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "nimi");
    			attr_dev(input0, "class", "svelte-h0yz13");
    			add_location(input0, file, 52, 2, 1204);
    			attr_dev(label1, "for", "salasana");
    			attr_dev(label1, "class", "svelte-h0yz13");
    			add_location(label1, file, 53, 2, 1255);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "salasana");
    			attr_dev(input1, "class", "svelte-h0yz13");
    			add_location(input1, file, 54, 2, 1297);
    			attr_dev(button, "class", "svelte-h0yz13");
    			add_location(button, file, 55, 2, 1362);
    			attr_dev(div, "class", "kirjautuminen svelte-h0yz13");
    			add_location(div, file, 47, 0, 1038);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, label0);
    			append_dev(div, t2);
    			append_dev(div, input0);
    			set_input_value(input0, /*nimi*/ ctx[1]);
    			append_dev(div, t3);
    			append_dev(div, label1);
    			append_dev(div, t5);
    			append_dev(div, input1);
    			set_input_value(input1, /*salasana*/ ctx[2]);
    			append_dev(div, t6);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(button, "click", /*kirjaudu*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*vaaratunnus*/ ctx[3]) {
    				if (if_block) ; else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*nimi*/ 2 && input0.value !== /*nimi*/ ctx[1]) {
    				set_input_value(input0, /*nimi*/ ctx[1]);
    			}

    			if (dirty & /*salasana*/ 4 && input1.value !== /*salasana*/ ctx[2]) {
    				set_input_value(input1, /*salasana*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(47:2) {#if !kirjautunut}",
    		ctx
    	});

    	return block;
    }

    // (49:2) {#if vaaratunnus}
    function create_if_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Väärä käyttäjätunnus tai salasana";
    			attr_dev(span, "class", "vaaratunnus svelte-h0yz13");
    			add_location(span, file, 49, 2, 1090);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(49:2) {#if vaaratunnus}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let t0;
    	let h1;
    	let t1_value = /*muuntaja*/ ctx[8].format(/*$pvm*/ ctx[4]) + "";
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (!/*kirjautunut*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			h1 = element("h1");
    			t1 = text(t1_value);
    			attr_dev(h1, "class", "svelte-h0yz13");
    			add_location(h1, file, 66, 0, 1715);
    			attr_dev(div, "class", "palkki svelte-h0yz13");
    			add_location(div, file, 45, 0, 994);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, h1);
    			append_dev(h1, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			}

    			if (dirty & /*$pvm*/ 16 && t1_value !== (t1_value = /*muuntaja*/ ctx[8].format(/*$pvm*/ ctx[4]) + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $kayttaja;
    	let $pvm;
    	validate_store(kayttaja, "kayttaja");
    	component_subscribe($$self, kayttaja, $$value => $$invalidate(12, $kayttaja = $$value));
    	validate_store(pvm, "pvm");
    	component_subscribe($$self, pvm, $$value => $$invalidate(4, $pvm = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TopBar", slots, []);
    	const dispatch = createEventDispatcher();
    	let nimi;
    	let salasana;
    	let { kirjautunut } = $$props;
    	let vaaratunnus = false;

    	//Tarkistaa mikäli syötetty nimi ja salasana ovat oikein. Jos ovat, niin lähettää juurikomponentille 'kirjaudu'-dispatchin.
    	function kirjaudu() {
    		if (nimi === $kayttaja.ktun && salasana === $kayttaja.salasana.toString()) {
    			dispatch("kirjaudu");
    			$$invalidate(3, vaaratunnus = false);
    		} else {
    			$$invalidate(3, vaaratunnus = true);
    		}
    	}

    	function kirjauduUlos() {
    		$$invalidate(0, kirjautunut = false);
    		$$invalidate(1, nimi = "");
    		$$invalidate(2, salasana = "");
    	}

    	//Apuna käytetty https://svelte.dev/tutorial/readable-stores
    	const muuntaja = new Intl.DateTimeFormat("fi",
    	{
    			hour12: false,
    			hour: "numeric",
    			minute: "2-digit",
    			second: "2-digit",
    			day: "2-digit",
    			month: "2-digit"
    		});

    	const writable_props = ["kirjautunut"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TopBar> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		nimi = this.value;
    		$$invalidate(1, nimi);
    	}

    	function input1_input_handler() {
    		salasana = this.value;
    		$$invalidate(2, salasana);
    	}

    	const click_handler = () => dispatch("uusipostaus");

    	$$self.$$set = $$props => {
    		if ("kirjautunut" in $$props) $$invalidate(0, kirjautunut = $$props.kirjautunut);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		space,
    		dispatch,
    		kayttaja,
    		pvm,
    		nimi,
    		salasana,
    		kirjautunut,
    		vaaratunnus,
    		kirjaudu,
    		kirjauduUlos,
    		muuntaja,
    		$kayttaja,
    		$pvm
    	});

    	$$self.$inject_state = $$props => {
    		if ("nimi" in $$props) $$invalidate(1, nimi = $$props.nimi);
    		if ("salasana" in $$props) $$invalidate(2, salasana = $$props.salasana);
    		if ("kirjautunut" in $$props) $$invalidate(0, kirjautunut = $$props.kirjautunut);
    		if ("vaaratunnus" in $$props) $$invalidate(3, vaaratunnus = $$props.vaaratunnus);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		kirjautunut,
    		nimi,
    		salasana,
    		vaaratunnus,
    		$pvm,
    		dispatch,
    		kirjaudu,
    		kirjauduUlos,
    		muuntaja,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler
    	];
    }

    class TopBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { kirjautunut: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TopBar",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*kirjautunut*/ ctx[0] === undefined && !("kirjautunut" in props)) {
    			console.warn("<TopBar> was created without expected prop 'kirjautunut'");
    		}
    	}

    	get kirjautunut() {
    		throw new Error("<TopBar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set kirjautunut(value) {
    		throw new Error("<TopBar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Sidebar.svelte generated by Svelte v3.34.0 */

    const file$1 = "src\\Sidebar.svelte";

    function create_fragment$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "asd";
    			attr_dev(div, "class", "svelte-1sigam3");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sidebar", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\Footer.svelte generated by Svelte v3.34.0 */

    const file$2 = "src\\Footer.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let p;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			p.textContent = "Site proudly created by Juho Ristolainen";
    			add_location(p, file$2, 1, 1, 8);
    			attr_dev(div, "class", "svelte-1hronr0");
    			add_location(div, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const postaus = writable([{}]);

    /* src\OnScreen.svelte generated by Svelte v3.34.0 */

    const { console: console_1 } = globals;
    const file$3 = "src\\OnScreen.svelte";

    // (24:2) {#if postauksia}
    function create_if_block$1(ctx) {
    	let h1;
    	let t0_value = /*$postaukset*/ ctx[1][/*$postaukset*/ ctx[1].length - 1].otsikko + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*$postaukset*/ ctx[1][/*$postaukset*/ ctx[1].length - 1].teksti + "";
    	let t2;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			attr_dev(h1, "class", "svelte-1uguahx");
    			add_location(h1, file$3, 24, 2, 366);
    			attr_dev(p, "class", "svelte-1uguahx");
    			add_location(p, file$3, 25, 2, 422);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$postaukset*/ 2 && t0_value !== (t0_value = /*$postaukset*/ ctx[1][/*$postaukset*/ ctx[1].length - 1].otsikko + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$postaukset*/ 2 && t2_value !== (t2_value = /*$postaukset*/ ctx[1][/*$postaukset*/ ctx[1].length - 1].teksti + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(24:2) {#if postauksia}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let t;
    	let footer;
    	let current;
    	let if_block = /*postauksia*/ ctx[0] && create_if_block$1(ctx);
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div, "class", "svelte-1uguahx");
    			add_location(div, file$3, 22, 0, 337);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			insert_dev(target, t, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*postauksia*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $postaukset;
    	validate_store(postaus, "postaukset");
    	component_subscribe($$self, postaus, $$value => $$invalidate(1, $postaukset = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OnScreen", slots, []);
    	let postauksia = false;

    	afterUpdate(() => {
    		if ($postaukset.length > 1) {
    			$$invalidate(0, postauksia = true);
    		} else {
    			$$invalidate(0, postauksia = false);
    		}
    	});

    	console.log($postaukset.length);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<OnScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		afterUpdate,
    		Footer,
    		postaukset: postaus,
    		postauksia,
    		$postaukset
    	});

    	$$self.$inject_state = $$props => {
    		if ("postauksia" in $$props) $$invalidate(0, postauksia = $$props.postauksia);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [postauksia, $postaukset];
    }

    class OnScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OnScreen",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\UusiBlogi.svelte generated by Svelte v3.34.0 */
    const file$4 = "src\\UusiBlogi.svelte";

    function create_fragment$4(ctx) {
    	let div4;
    	let div3;
    	let h2;
    	let t1;
    	let div0;
    	let t3;
    	let input;
    	let t4;
    	let div1;
    	let t6;
    	let textarea;
    	let t7;
    	let div2;
    	let button0;
    	let t9;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Luo uusi postaus";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "Otsikko";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Teksti";
    			t6 = space();
    			textarea = element("textarea");
    			t7 = space();
    			div2 = element("div");
    			button0 = element("button");
    			button0.textContent = "Peruuta";
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "Lähetä";
    			add_location(h2, file$4, 31, 0, 716);
    			add_location(div0, file$4, 32, 0, 743);
    			attr_dev(input, "class", "otsikko svelte-pecym6");
    			attr_dev(input, "type", "text");
    			add_location(input, file$4, 33, 0, 763);
    			add_location(div1, file$4, 34, 0, 821);
    			attr_dev(textarea, "name", "");
    			attr_dev(textarea, "id", "");
    			attr_dev(textarea, "cols", "151");
    			attr_dev(textarea, "rows", "20");
    			attr_dev(textarea, "class", "svelte-pecym6");
    			add_location(textarea, file$4, 35, 0, 840);
    			attr_dev(button0, "class", "svelte-pecym6");
    			add_location(button0, file$4, 37, 2, 944);
    			attr_dev(button1, "class", "svelte-pecym6");
    			add_location(button1, file$4, 38, 2, 1009);
    			attr_dev(div2, "class", "napit");
    			add_location(div2, file$4, 36, 0, 921);
    			attr_dev(div3, "class", "kirjoitus svelte-pecym6");
    			add_location(div3, file$4, 30, 0, 691);
    			attr_dev(div4, "class", "modal svelte-pecym6");
    			add_location(div4, file$4, 29, 0, 670);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, h2);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div3, t3);
    			append_dev(div3, input);
    			set_input_value(input, /*otsikko*/ ctx[1]);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div3, t6);
    			append_dev(div3, textarea);
    			set_input_value(textarea, /*kirjoitus*/ ctx[0]);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, button0);
    			append_dev(div2, t9);
    			append_dev(div2, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[4]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[5]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*luoPostaus*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*otsikko*/ 2 && input.value !== /*otsikko*/ ctx[1]) {
    				set_input_value(input, /*otsikko*/ ctx[1]);
    			}

    			if (dirty & /*kirjoitus*/ 1) {
    				set_input_value(textarea, /*kirjoitus*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $kayttaja;
    	validate_store(kayttaja, "kayttaja");
    	component_subscribe($$self, kayttaja, $$value => $$invalidate(7, $kayttaja = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("UusiBlogi", slots, []);
    	const dispatch = createEventDispatcher();

    	class Blogi {
    		constructor(kirjoittaja, otsikko, tagit, teksti) {
    			this.kirjoittaja = kirjoittaja;
    			this.otsikko = otsikko;
    			this.tagit = tagit;
    			this.teksti = teksti;
    		}
    	}

    	let kirjoitus = "";
    	let otsikko = "";

    	const luoPostaus = function () {
    		const uusiPostaus = new Blogi($kayttaja.ktun, otsikko, ["on", "jees"], kirjoitus);
    		postaus.update(p => [...p, uusiPostaus]);
    		dispatch("luotu");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<UusiBlogi> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		otsikko = this.value;
    		$$invalidate(1, otsikko);
    	}

    	function textarea_input_handler() {
    		kirjoitus = this.value;
    		$$invalidate(0, kirjoitus);
    	}

    	const click_handler = () => dispatch("peruuta");

    	$$self.$capture_state = () => ({
    		kayttaja,
    		postaus,
    		createEventDispatcher,
    		dispatch,
    		Blogi,
    		kirjoitus,
    		otsikko,
    		luoPostaus,
    		$kayttaja
    	});

    	$$self.$inject_state = $$props => {
    		if ("kirjoitus" in $$props) $$invalidate(0, kirjoitus = $$props.kirjoitus);
    		if ("otsikko" in $$props) $$invalidate(1, otsikko = $$props.otsikko);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		kirjoitus,
    		otsikko,
    		dispatch,
    		luoPostaus,
    		input_input_handler,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class UusiBlogi extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UusiBlogi",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.34.0 */
    const file$5 = "src\\App.svelte";

    // (16:0) {#if bloginLuonti}
    function create_if_block$2(ctx) {
    	let kirjoittaminen;
    	let current;
    	kirjoittaminen = new UusiBlogi({ $$inline: true });
    	kirjoittaminen.$on("luotu", /*luotu_handler*/ ctx[4]);
    	kirjoittaminen.$on("peruuta", /*peruuta_handler*/ ctx[5]);

    	const block = {
    		c: function create() {
    			create_component(kirjoittaminen.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(kirjoittaminen, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(kirjoittaminen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(kirjoittaminen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(kirjoittaminen, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(16:0) {#if bloginLuonti}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let topbar;
    	let t0;
    	let sidebar;
    	let t1;
    	let onscreen;
    	let t2;
    	let current;

    	topbar = new TopBar({
    			props: {
    				kirjautunut: /*kirjautunutSisaan*/ ctx[0]
    			},
    			$$inline: true
    		});

    	topbar.$on("kirjaudu", /*kirjaudu_handler*/ ctx[2]);
    	topbar.$on("uusipostaus", /*uusipostaus_handler*/ ctx[3]);
    	sidebar = new Sidebar({ $$inline: true });
    	onscreen = new OnScreen({ $$inline: true });
    	let if_block = /*bloginLuonti*/ ctx[1] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(topbar.$$.fragment);
    			t0 = space();
    			create_component(sidebar.$$.fragment);
    			t1 = space();
    			create_component(onscreen.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "sivu svelte-tew01g");
    			add_location(div, file$5, 11, 0, 248);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(topbar, div, null);
    			append_dev(div, t0);
    			mount_component(sidebar, div, null);
    			append_dev(div, t1);
    			mount_component(onscreen, div, null);
    			append_dev(div, t2);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const topbar_changes = {};
    			if (dirty & /*kirjautunutSisaan*/ 1) topbar_changes.kirjautunut = /*kirjautunutSisaan*/ ctx[0];
    			topbar.$set(topbar_changes);

    			if (/*bloginLuonti*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*bloginLuonti*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topbar.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(onscreen.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topbar.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(onscreen.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(topbar);
    			destroy_component(sidebar);
    			destroy_component(onscreen);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let kirjautunutSisaan = false;
    	let bloginLuonti = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const kirjaudu_handler = () => $$invalidate(0, kirjautunutSisaan = true);
    	const uusipostaus_handler = () => $$invalidate(1, bloginLuonti = true);
    	const luotu_handler = () => $$invalidate(1, bloginLuonti = false);
    	const peruuta_handler = () => $$invalidate(1, bloginLuonti = false);

    	$$self.$capture_state = () => ({
    		TopBar,
    		Sidebar,
    		OnScreen,
    		Kirjoittaminen: UusiBlogi,
    		kirjautunutSisaan,
    		bloginLuonti
    	});

    	$$self.$inject_state = $$props => {
    		if ("kirjautunutSisaan" in $$props) $$invalidate(0, kirjautunutSisaan = $$props.kirjautunutSisaan);
    		if ("bloginLuonti" in $$props) $$invalidate(1, bloginLuonti = $$props.bloginLuonti);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		kirjautunutSisaan,
    		bloginLuonti,
    		kirjaudu_handler,
    		uusipostaus_handler,
    		luotu_handler,
    		peruuta_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {},
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
