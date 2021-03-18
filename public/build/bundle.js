
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
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

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    let kayttajat = [];
    let fbUrl =
      'https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/';

    const kayttaja = writable({});

    //Hakee käyttäjätiedot firebasesta.
    const haeKayttajat = async () => {
      const response = await fetch(`${fbUrl}kayttajat.json`);
      if (!response.ok) {
        throw new Error('Dataa ei saatu');
      }
      const data = await response.json();
      for (const key in data) {
        kayttajat.push({ id: key, ...data[key] });
      }
      kayttajat = kayttajat;
      kayttaja.set(kayttajat);
    };

    haeKayttajat();

    const kirjautunutKayttaja = writable([{}]);

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

    // (67:0) {:else}
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
    			attr_dev(button0, "class", "uusipostaus svelte-18te0a6");
    			add_location(button0, file, 68, 2, 1821);
    			add_location(h2, file, 70, 4, 1945);
    			attr_dev(div0, "class", "tervehdys svelte-18te0a6");
    			add_location(div0, file, 69, 2, 1916);
    			attr_dev(button1, "class", "kirjauduUlos svelte-18te0a6");
    			add_location(button1, file, 72, 0, 1980);
    			attr_dev(div1, "class", "kirjautunut");
    			add_location(div1, file, 67, 0, 1792);
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
    					listen_dev(button0, "click", /*click_handler_1*/ ctx[12], false, false, false),
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
    		source: "(67:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (55:2) {#if !kirjautunut}
    function create_if_block(ctx) {
    	let div;
    	let t0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let button0;
    	let t5;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let button1;
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
    			button0 = element("button");
    			button0.textContent = "Rekisteröidy";
    			t5 = space();
    			label1 = element("label");
    			label1.textContent = "Salasana";
    			t7 = space();
    			input1 = element("input");
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Kirjaudu sisään!";
    			attr_dev(label0, "for", "nimi");
    			attr_dev(label0, "class", "svelte-18te0a6");
    			add_location(label0, file, 59, 2, 1432);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "nimi");
    			attr_dev(input0, "class", "svelte-18te0a6");
    			add_location(input0, file, 60, 2, 1466);
    			attr_dev(button0, "class", "rekisteroidy svelte-18te0a6");
    			add_location(button0, file, 61, 2, 1517);
    			attr_dev(label1, "for", "salasana");
    			attr_dev(label1, "class", "svelte-18te0a6");
    			add_location(label1, file, 62, 2, 1613);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "salasana");
    			attr_dev(input1, "class", "svelte-18te0a6");
    			add_location(input1, file, 63, 2, 1655);
    			attr_dev(button1, "class", "svelte-18te0a6");
    			add_location(button1, file, 64, 2, 1720);
    			attr_dev(div, "class", "kirjautuminen");
    			add_location(div, file, 55, 0, 1300);
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
    			append_dev(div, button0);
    			append_dev(div, t5);
    			append_dev(div, label1);
    			append_dev(div, t7);
    			append_dev(div, input1);
    			set_input_value(input1, /*salasana*/ ctx[2]);
    			append_dev(div, t8);
    			append_dev(div, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[10], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen_dev(button1, "click", /*kirjaudu*/ ctx[6], false, false, false)
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
    		source: "(55:2) {#if !kirjautunut}",
    		ctx
    	});

    	return block;
    }

    // (57:2) {#if vaaratunnus}
    function create_if_block_1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Väärä käyttäjätunnus tai salasana";
    			attr_dev(span, "class", "vaaratunnus svelte-18te0a6");
    			add_location(span, file, 57, 2, 1352);
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
    		source: "(57:2) {#if vaaratunnus}",
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
    			attr_dev(h1, "class", "svelte-18te0a6");
    			add_location(h1, file, 75, 0, 2073);
    			attr_dev(div, "class", "palkki svelte-18te0a6");
    			add_location(div, file, 53, 0, 1256);
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
    	component_subscribe($$self, kayttaja, $$value => $$invalidate(13, $kayttaja = $$value));
    	validate_store(pvm, "pvm");
    	component_subscribe($$self, pvm, $$value => $$invalidate(4, $pvm = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TopBar", slots, []);
    	const dispatch = createEventDispatcher();
    	let nimi;
    	let salasana;
    	let { kirjautunut } = $$props;
    	let vaaratunnus = false;

    	//Tarkistaa mikäli syötetty nimi ja salasana ovat oikein. Jos ovat, niin lähettää juurikomponentille 'kirjaudu'-dispatchin 
    	// ja asettaa kirjautunut-storen arvoksi käyttäjänimen.
    	function kirjaudu() {
    		for (let i = 0; i < $kayttaja.length; i++) {
    			if (nimi === $kayttaja[i].nimi) {
    				if (salasana === $kayttaja[i].salasana) {
    					$$invalidate(0, kirjautunut = true);
    					kirjautunutKayttaja.set($kayttaja[i].nimi);
    				} else {
    					$$invalidate(3, vaaratunnus = true);
    				}
    			} else {
    				$$invalidate(3, vaaratunnus = true);
    			}
    		}
    	}

    	function kirjauduUlos() {
    		$$invalidate(0, kirjautunut = false);
    		$$invalidate(1, nimi = "");
    		$$invalidate(2, salasana = "");
    		$$invalidate(3, vaaratunnus = false);
    		kirjautunutKayttaja.set();
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

    	const click_handler = () => dispatch("rekisteroidy");

    	function input1_input_handler() {
    		salasana = this.value;
    		$$invalidate(2, salasana);
    	}

    	const click_handler_1 = () => dispatch("uusipostaus");

    	$$self.$$set = $$props => {
    		if ("kirjautunut" in $$props) $$invalidate(0, kirjautunut = $$props.kirjautunut);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		kayttaja,
    		kirjautunutKayttaja,
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
    		click_handler,
    		input1_input_handler,
    		click_handler_1
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

    /* src\OnScreen.svelte generated by Svelte v3.34.0 */

    const { Error: Error_1, console: console_1 } = globals;
    const file$1 = "src\\OnScreen.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (48:4) {#each postaus as posti(posti.id)}
    function create_each_block(key_1, ctx) {
    	let div2;
    	let h1;
    	let t0_value = /*posti*/ ctx[6].otsikko + "";
    	let t0;
    	let t1;
    	let div0;
    	let t2;
    	let t3_value = /*posti*/ ctx[6].kirjoittaja + "";
    	let t3;
    	let t4;
    	let div1;
    	let span;
    	let t5_value = /*posti*/ ctx[6].postaus + "";
    	let t5;
    	let t6;
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*posti*/ ctx[6]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			div2 = element("div");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			t2 = text("Kirjoittaja: ");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			span = element("span");
    			t5 = text(t5_value);
    			t6 = space();
    			img = element("img");
    			attr_dev(h1, "class", "svelte-3cgvi0");
    			add_location(h1, file$1, 49, 6, 1189);
    			attr_dev(div0, "class", "kirjoittaja svelte-3cgvi0");
    			add_location(div0, file$1, 50, 6, 1221);
    			attr_dev(span, "class", "teksti svelte-3cgvi0");
    			add_location(span, file$1, 52, 6, 1326);
    			attr_dev(div1, "class", "tekstikentta svelte-3cgvi0");
    			add_location(div1, file$1, 51, 6, 1292);
    			attr_dev(img, "class", "poista svelte-3cgvi0");
    			attr_dev(img, "width", "60px");
    			if (img.src !== (img_src_value = "data:image/png;base64,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")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 54, 6, 1389);
    			attr_dev(div2, "class", "postaus svelte-3cgvi0");
    			add_location(div2, file$1, 48, 4, 1160);
    			this.first = div2;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h1);
    			append_dev(h1, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    			append_dev(span, t5);
    			append_dev(div2, t6);
    			append_dev(div2, img);

    			if (!mounted) {
    				dispose = listen_dev(img, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*postaus*/ 1 && t0_value !== (t0_value = /*posti*/ ctx[6].otsikko + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*postaus*/ 1 && t3_value !== (t3_value = /*posti*/ ctx[6].kirjoittaja + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*postaus*/ 1 && t5_value !== (t5_value = /*posti*/ ctx[6].postaus + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(48:4) {#each postaus as posti(posti.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value = /*postaus*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*posti*/ ctx[6].id;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			button = element("button");
    			button.textContent = "Päivitä";
    			attr_dev(button, "class", "paivita svelte-3cgvi0");
    			add_location(button, file$1, 57, 4, 19171);
    			attr_dev(div, "class", "svelte-3cgvi0");
    			add_location(div, file$1, 45, 0, 1074);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t0);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*poistaPostaus, postaus*/ 5) {
    				each_value = /*postaus*/ ctx[0];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block, t0, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			dispose();
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OnScreen", slots, []);
    	let postaus = [];
    	let fbUrl = "https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/";

    	//Hakee postaukset firebasesta. Kopioitu frontend kurssin materiaaleista ja säädetty toimimaan oikealla tavalla
    	const haePostaus = async () => {
    		$$invalidate(0, postaus = []);
    		const response = await fetch(`${fbUrl}postaukset.json`);

    		if (!response.ok) {
    			throw new Error("Dataa ei saatu");
    		}

    		const data = await response.json();

    		for (const key in data) {
    			postaus.push({ id: key, ...data[key] });
    		}

    		$$invalidate(0, postaus);
    		postaukset.set(postaus);
    	};

    	haePostaus();

    	//Poistaa postauksen firebasesta. Kopioitu frontend kurssin materiaaleista ja säädetty toimimaan oikealla tavalla
    	const poistaPostaus = id => {
    		fetch(`${fbUrl}postaukset/${id}.json`, { method: "DELETE" }).then(response => {
    			if (!response.ok) {
    				throw new Error("Ei voi poistaa");
    			}

    			haePostaus();
    		}).catch(err => {
    			console.log(err);
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<OnScreen> was created with unknown prop '${key}'`);
    	});

    	const click_handler = posti => poistaPostaus(posti.id);
    	const click_handler_1 = () => haePostaus();

    	$$self.$capture_state = () => ({
    		postaus,
    		fbUrl,
    		haePostaus,
    		poistaPostaus
    	});

    	$$self.$inject_state = $$props => {
    		if ("postaus" in $$props) $$invalidate(0, postaus = $$props.postaus);
    		if ("fbUrl" in $$props) fbUrl = $$props.fbUrl;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [postaus, haePostaus, poistaPostaus, click_handler, click_handler_1];
    }

    class OnScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OnScreen",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\UusiPostaus.svelte generated by Svelte v3.34.0 */

    const { Error: Error_1$1, console: console_1$1 } = globals;
    const file$2 = "src\\UusiPostaus.svelte";

    function create_fragment$2(ctx) {
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
    			add_location(h2, file$2, 38, 0, 924);
    			add_location(div0, file$2, 39, 0, 951);
    			attr_dev(input, "class", "otsikko svelte-pecym6");
    			attr_dev(input, "type", "text");
    			add_location(input, file$2, 40, 0, 971);
    			add_location(div1, file$2, 41, 0, 1029);
    			attr_dev(textarea, "name", "");
    			attr_dev(textarea, "id", "");
    			attr_dev(textarea, "cols", "151");
    			attr_dev(textarea, "rows", "15");
    			attr_dev(textarea, "class", "svelte-pecym6");
    			add_location(textarea, file$2, 42, 0, 1048);
    			attr_dev(button0, "class", "svelte-pecym6");
    			add_location(button0, file$2, 44, 2, 1152);
    			attr_dev(button1, "class", "svelte-pecym6");
    			add_location(button1, file$2, 45, 2, 1217);
    			attr_dev(div2, "class", "napit");
    			add_location(div2, file$2, 43, 0, 1129);
    			attr_dev(div3, "class", "kirjoitus svelte-pecym6");
    			add_location(div3, file$2, 37, 0, 899);
    			attr_dev(div4, "class", "modal svelte-pecym6");
    			add_location(div4, file$2, 36, 0, 878);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
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
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[6]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false)
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $kirjautunutKayttaja;
    	validate_store(kirjautunutKayttaja, "kirjautunutKayttaja");
    	component_subscribe($$self, kirjautunutKayttaja, $$value => $$invalidate(2, $kirjautunutKayttaja = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("UusiPostaus", slots, []);
    	const dispatch = createEventDispatcher();
    	let fbUrl = "https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/";
    	let kirjoitus = "";
    	let otsikko = "";
    	let nimi;

    	//Luo uuden postauksen firebaseen. Kopioitu frontend kurssin materiaaleista ja säädetty toimimaan oikealla tavalla
    	const uusiPostaus = postaus => {
    		fetch(`${fbUrl}postaukset.json`, {
    			method: "POST",
    			body: JSON.stringify(postaus),
    			headers: { "Content-Type": "application/json" }
    		}).then(response => {
    			if (!response.ok) {
    				throw new Error("Lisääminen ei onnistu");
    			}

    			dispatch("luotu");
    		}).catch(err => {
    			console.log(err);
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<UusiPostaus> was created with unknown prop '${key}'`);
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

    	const click_handler_1 = () => uusiPostaus({
    		kirjoittaja: $kirjautunutKayttaja,
    		otsikko,
    		postaus: kirjoitus
    	});

    	$$self.$capture_state = () => ({
    		kirjautunutKayttaja,
    		createEventDispatcher,
    		dispatch,
    		fbUrl,
    		kirjoitus,
    		otsikko,
    		nimi,
    		uusiPostaus,
    		$kirjautunutKayttaja
    	});

    	$$self.$inject_state = $$props => {
    		if ("fbUrl" in $$props) fbUrl = $$props.fbUrl;
    		if ("kirjoitus" in $$props) $$invalidate(0, kirjoitus = $$props.kirjoitus);
    		if ("otsikko" in $$props) $$invalidate(1, otsikko = $$props.otsikko);
    		if ("nimi" in $$props) nimi = $$props.nimi;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		kirjoitus,
    		otsikko,
    		$kirjautunutKayttaja,
    		dispatch,
    		uusiPostaus,
    		input_input_handler,
    		textarea_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class UusiPostaus extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UusiPostaus",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src\Register.svelte generated by Svelte v3.34.0 */

    const { Error: Error_1$2, console: console_1$2 } = globals;
    const file$3 = "src\\Register.svelte";

    // (59:4) {#if !validiNimi}
    function create_if_block_1$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Käyttäjätunnuksessa täytyy olla vähintään neljä merkkiä!";
    			attr_dev(span, "class", "virhe svelte-vswq5t");
    			add_location(span, file$3, 59, 4, 1550);
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
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(59:4) {#if !validiNimi}",
    		ctx
    	});

    	return block;
    }

    // (65:4) {#if !validiSalasana}
    function create_if_block$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "Salasanassa täytyy olla vähintään neljä merkkiä!";
    			attr_dev(span, "class", "virhe svelte-vswq5t");
    			add_location(span, file$3, 65, 4, 1905);
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(65:4) {#if !validiSalasana}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let t0;
    	let div2;
    	let div1;
    	let h2;
    	let t2;
    	let label0;
    	let t4;
    	let input0;
    	let t5;
    	let t6;
    	let label1;
    	let t8;
    	let input1;
    	let t9;
    	let t10;
    	let div0;
    	let t11;
    	let button0;
    	let t13;
    	let button1;
    	let div1_transition;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = !/*validiNimi*/ ctx[2] && create_if_block_1$1(ctx);
    	let if_block1 = !/*validiSalasana*/ ctx[3] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			t0 = text("//Modali tehty Tikokaupan modalin mukaan.\r\n");
    			div2 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "REKISTERÖIDY";
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Nimi";
    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			label1 = element("label");
    			label1.textContent = "Salasana";
    			t8 = space();
    			input1 = element("input");
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			div0 = element("div");
    			t11 = space();
    			button0 = element("button");
    			button0.textContent = "Peruuta";
    			t13 = space();
    			button1 = element("button");
    			button1.textContent = "Rekisteröidy";
    			add_location(h2, file$3, 54, 4, 1297);
    			attr_dev(label0, "for", "uusinimi");
    			add_location(label0, file$3, 55, 4, 1324);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "uusinimi");
    			attr_dev(input0, "placeholder", "Syötä nimesi");
    			add_location(input0, file$3, 56, 4, 1364);
    			attr_dev(label1, "for", "uusisalasana");
    			add_location(label1, file$3, 61, 4, 1650);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "id", "uusisalasana");
    			attr_dev(input1, "placeholder", "Syötä salasana");
    			add_location(input1, file$3, 62, 4, 1698);
    			add_location(div0, file$3, 67, 4, 1997);
    			add_location(button0, file$3, 69, 4, 2020);
    			add_location(button1, file$3, 70, 4, 2069);
    			attr_dev(div1, "class", "rekisteroidy svelte-vswq5t");
    			add_location(div1, file$3, 53, 2, 1248);
    			attr_dev(div2, "class", "modal svelte-vswq5t");
    			add_location(div2, file$3, 52, 0, 1225);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$2("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t2);
    			append_dev(div1, label0);
    			append_dev(div1, t4);
    			append_dev(div1, input0);
    			set_input_value(input0, /*uusiNimi*/ ctx[0]);
    			append_dev(div1, t5);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t6);
    			append_dev(div1, label1);
    			append_dev(div1, t8);
    			append_dev(div1, input1);
    			set_input_value(input1, /*uusiSalasana*/ ctx[1]);
    			append_dev(div1, t9);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t10);
    			append_dev(div1, div0);
    			append_dev(div1, t11);
    			append_dev(div1, button0);
    			append_dev(div1, t13);
    			append_dev(div1, button1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(button0, "click", /*peruuta*/ ctx[5], false, false, false),
    					listen_dev(button1, "click", /*click_handler*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*uusiNimi*/ 1 && input0.value !== /*uusiNimi*/ ctx[0]) {
    				set_input_value(input0, /*uusiNimi*/ ctx[0]);
    			}

    			if (!/*validiNimi*/ ctx[2]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(div1, t6);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*uusiSalasana*/ 2 && input1.value !== /*uusiSalasana*/ ctx[1]) {
    				set_input_value(input1, /*uusiSalasana*/ ctx[1]);
    			}

    			if (!/*validiSalasana*/ ctx[3]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div1, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, scale, {}, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, scale, {}, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching && div1_transition) div1_transition.end();
    			mounted = false;
    			run_all(dispose);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Register", slots, []);
    	const dispatch = createEventDispatcher();
    	let fbUrl = "https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/";
    	let uusiNimi;
    	let uusiSalasana;
    	let validiNimi = true;
    	let validiSalasana = true;

    	//Tarkistaa, että käyttäjatunnus ja salasana on validi. Tämän jälkeen luo uuden käyttäjän firebaseen.
    	const luoKayttaja = function (kayttaja) {
    		if (kayttaja.nimi.length > 3) {
    			$$invalidate(2, validiNimi = true);
    		} else {
    			$$invalidate(2, validiNimi = false);
    		}

    		if (kayttaja.salasana.length > 3) {
    			$$invalidate(3, validiSalasana = true);
    		} else {
    			$$invalidate(3, validiSalasana = false);
    		}

    		if (validiNimi && validiSalasana) {
    			dispatch("rekisteroidytty");

    			fetch(`${fbUrl}kayttajat.json`, {
    				method: "POST",
    				body: JSON.stringify(kayttaja),
    				headers: { "Content-Type": "application/json" }
    			}).then(response => {
    				if (!response.ok) {
    					throw new Error("Lisääminen ei onnistu");
    				}
    			}).catch(err => {
    				console.log(err);
    			});
    		}
    	};

    	const peruuta = function () {
    		dispatch("peruuta");
    		$$invalidate(0, uusiNimi = "");
    		$$invalidate(1, uusiSalasana = "");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Register> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		uusiNimi = this.value;
    		$$invalidate(0, uusiNimi);
    	}

    	function input1_input_handler() {
    		uusiSalasana = this.value;
    		$$invalidate(1, uusiSalasana);
    	}

    	const click_handler = () => luoKayttaja({ nimi: uusiNimi, salasana: uusiSalasana });

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		scale,
    		dispatch,
    		fbUrl,
    		uusiNimi,
    		uusiSalasana,
    		validiNimi,
    		validiSalasana,
    		luoKayttaja,
    		peruuta
    	});

    	$$self.$inject_state = $$props => {
    		if ("fbUrl" in $$props) fbUrl = $$props.fbUrl;
    		if ("uusiNimi" in $$props) $$invalidate(0, uusiNimi = $$props.uusiNimi);
    		if ("uusiSalasana" in $$props) $$invalidate(1, uusiSalasana = $$props.uusiSalasana);
    		if ("validiNimi" in $$props) $$invalidate(2, validiNimi = $$props.validiNimi);
    		if ("validiSalasana" in $$props) $$invalidate(3, validiSalasana = $$props.validiSalasana);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		uusiNimi,
    		uusiSalasana,
    		validiNimi,
    		validiSalasana,
    		luoKayttaja,
    		peruuta,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler
    	];
    }

    class Register extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Register",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.34.0 */
    const file$4 = "src\\App.svelte";

    // (18:0) {#if bloginLuonti}
    function create_if_block_1$2(ctx) {
    	let kirjoittaminen;
    	let current;
    	kirjoittaminen = new UusiPostaus({ $$inline: true });
    	kirjoittaminen.$on("peruuta", /*peruuta_handler*/ ctx[6]);
    	kirjoittaminen.$on("luotu", /*luotu_handler*/ ctx[7]);

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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(18:0) {#if bloginLuonti}",
    		ctx
    	});

    	return block;
    }

    // (21:0) {#if rekisteroityminen}
    function create_if_block$2(ctx) {
    	let rekisteroityminen_1;
    	let current;
    	rekisteroityminen_1 = new Register({ $$inline: true });
    	rekisteroityminen_1.$on("peruuta", /*peruuta_handler_1*/ ctx[8]);
    	rekisteroityminen_1.$on("rekisteroidytty", /*rekisteroidytty_handler*/ ctx[9]);

    	const block = {
    		c: function create() {
    			create_component(rekisteroityminen_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(rekisteroityminen_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rekisteroityminen_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rekisteroityminen_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(rekisteroityminen_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(21:0) {#if rekisteroityminen}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let topbar;
    	let t0;
    	let onscreen;
    	let t1;
    	let t2;
    	let current;

    	topbar = new TopBar({
    			props: {
    				kirjautunut: /*kirjautunutSisaan*/ ctx[0]
    			},
    			$$inline: true
    		});

    	topbar.$on("kirjaudu", /*kirjaudu_handler*/ ctx[3]);
    	topbar.$on("uusipostaus", /*uusipostaus_handler*/ ctx[4]);
    	topbar.$on("rekisteroidy", /*rekisteroidy_handler*/ ctx[5]);
    	onscreen = new OnScreen({ $$inline: true });
    	let if_block0 = /*bloginLuonti*/ ctx[1] && create_if_block_1$2(ctx);
    	let if_block1 = /*rekisteroityminen*/ ctx[2] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(topbar.$$.fragment);
    			t0 = space();
    			create_component(onscreen.$$.fragment);
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", "sivu");
    			add_location(div, file$4, 14, 0, 294);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(topbar, div, null);
    			append_dev(div, t0);
    			mount_component(onscreen, div, null);
    			append_dev(div, t1);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t2);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const topbar_changes = {};
    			if (dirty & /*kirjautunutSisaan*/ 1) topbar_changes.kirjautunut = /*kirjautunutSisaan*/ ctx[0];
    			topbar.$set(topbar_changes);

    			if (/*bloginLuonti*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*bloginLuonti*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t2);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*rekisteroityminen*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*rekisteroityminen*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topbar.$$.fragment, local);
    			transition_in(onscreen.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topbar.$$.fragment, local);
    			transition_out(onscreen.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(topbar);
    			destroy_component(onscreen);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let kirjautunutSisaan = false;
    	let bloginLuonti = false;
    	let rekisteroityminen = false;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const kirjaudu_handler = () => $$invalidate(0, kirjautunutSisaan = true);
    	const uusipostaus_handler = () => $$invalidate(1, bloginLuonti = true);
    	const rekisteroidy_handler = () => $$invalidate(2, rekisteroityminen = true);
    	const peruuta_handler = () => $$invalidate(1, bloginLuonti = false);
    	const luotu_handler = () => $$invalidate(1, bloginLuonti = false);
    	const peruuta_handler_1 = () => $$invalidate(2, rekisteroityminen = false);
    	const rekisteroidytty_handler = () => $$invalidate(2, rekisteroityminen = false);

    	$$self.$capture_state = () => ({
    		TopBar,
    		OnScreen,
    		Kirjoittaminen: UusiPostaus,
    		Rekisteroityminen: Register,
    		kirjautunutSisaan,
    		bloginLuonti,
    		rekisteroityminen
    	});

    	$$self.$inject_state = $$props => {
    		if ("kirjautunutSisaan" in $$props) $$invalidate(0, kirjautunutSisaan = $$props.kirjautunutSisaan);
    		if ("bloginLuonti" in $$props) $$invalidate(1, bloginLuonti = $$props.bloginLuonti);
    		if ("rekisteroityminen" in $$props) $$invalidate(2, rekisteroityminen = $$props.rekisteroityminen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		kirjautunutSisaan,
    		bloginLuonti,
    		rekisteroityminen,
    		kirjaudu_handler,
    		uusipostaus_handler,
    		rekisteroidy_handler,
    		peruuta_handler,
    		luotu_handler,
    		peruuta_handler_1,
    		rekisteroidytty_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
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
