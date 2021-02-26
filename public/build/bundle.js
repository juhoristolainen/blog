
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
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

    /* src\TopBar.svelte generated by Svelte v3.34.0 */

    const file = "src\\TopBar.svelte";

    function create_fragment(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "asd";
    			attr_dev(div, "class", "svelte-kd39b1");
    			add_location(div, file, 0, 0, 0);
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TopBar", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TopBar> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class TopBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TopBar",
    			options,
    			id: create_fragment.name
    		});
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
    			attr_dev(div, "class", "svelte-vwj9js");
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

    /* src\OnScreen.svelte generated by Svelte v3.34.0 */
    const file$3 = "src\\OnScreen.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let h2;
    	let t5;
    	let p1;
    	let t7;
    	let footer;
    	let current;
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "LOREMIA LOREMIA";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Veniam recusandae expedita corporis, tempora blanditiis doloribus eligendi sunt vero porro minima dicta debitis dolore aperiam totam ipsum ab aliquid? Cum, voluptatem.\r\n  Repellat laboriosam a alias aliquid aliquam. Inventore quis neque sed quos asperiores qui. Cupiditate maxime veritatis autem odio, at libero nulla nostrum dolores maiores, perferendis quae eaque tempore unde laboriosam.\r\n  Culpa eaque aspernatur, provident ad id, vero ipsum laborum amet quidem ex, incidunt quae officiis sunt molestias ea eum distinctio mollitia numquam repellat dolore at exercitationem corporis error quam. Dignissimos.\r\n  Optio perspiciatis cumque impedit veritatis. Facere animi omnis sapiente facilis laborum iusto recusandae quaerat nesciunt a cumque enim quis praesentium voluptate commodi, dolorum impedit fuga blanditiis incidunt adipisci consequatur assumenda?\r\n  Exercitationem fugiat, magni, voluptate aliquid rerum amet, nihil hic consectetur quaerat atque ipsa vel similique recusandae? Quaerat aliquid, natus quidem aliquam ad, tempore reiciendis earum culpa nihil nostrum, dolores modi!\r\n  Id voluptates consequatur vel officiis porro aliquid nesciunt magnam fugiat ducimus quae fuga, commodi sit ratione excepturi perspiciatis. Ad alias, quae maiores debitis est vitae. Reiciendis beatae unde labore libero!\r\n  Molestiae nostrum velit sequi eveniet reprehenderit quasi necessitatibus libero accusamus odio! Et facere iusto temporibus facilis dolore iste, eius odio. Deserunt corrupti debitis id ea quisquam itaque. Mollitia, ducimus odit!\r\n  Ex, vitae adipisci totam delectus maxime nemo enim iure voluptatum corporis sed! Architecto laboriosam nesciunt obcaecati tenetur deleniti veniam, odio, consectetur laborum dolorum accusantium molestias praesentium aliquid officia impedit possimus?\r\n  Cumque voluptate fugit pariatur minima a! Dolorem omnis sapiente expedita ratione ut minus provident pariatur neque officia nemo nostrum asperiores velit laudantium dolorum explicabo quaerat commodi tempora magnam, maxime qui.\r\n  Esse consectetur cum excepturi eos amet, voluptas ab tempora repellat facilis, veniam neque maiores placeat eum a velit? Ex quidem similique repudiandae dicta voluptate harum tempore tempora autem maiores facilis.\r\n  Temporibus voluptatibus aperiam itaque minus numquam similique nihil? Recusandae iusto architecto beatae non illo voluptate optio commodi. Nihil alias in suscipit id sit unde totam rerum, commodi asperiores nemo corporis!\r\n  Animi delectus odit aliquam, laborum veniam eos perferendis, debitis non, laudantium culpa eligendi saepe illum ipsam pariatur dolorem fugit autem cum! A autem quidem non, ratione asperiores culpa iste dolore.\r\n  Atque voluptatum quia esse saepe cumque recusandae neque expedita quisquam amet error eaque deserunt quam doloribus praesentium sint qui, vero inventore distinctio, aut quaerat reiciendis rerum? Excepturi animi totam dolore.\r\n  Iusto enim sapiente recusandae, rem eius blanditiis accusantium excepturi ducimus exercitationem ratione facilis commodi aliquid tempora dignissimos quidem sed velit vel hic maiores perferendis consequuntur totam. Magnam sunt voluptatibus provident.\r\n  Maiores rerum, veniam deleniti saepe adipisci aut vero natus temporibus? Iusto eum, totam beatae eveniet sapiente accusantium tempore possimus, laborum illum et dignissimos minima doloribus aperiam dolore atque, quia labore?\r\n  Ipsam, reprehenderit! Maiores accusamus perferendis, laborum perspiciatis facilis maxime.";
    			t3 = space();
    			h2 = element("h2");
    			h2.textContent = "VÄLIOTSIKKO";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Lorem, ipsum dolor sit amet consectetur adipisicing elit. Earum tenetur quos, incidunt sapiente reprehenderit quo et, deleniti explicabo laborum obcaecati facere. Neque ex, nulla modi consectetur est harum aliquid. Ducimus!\r\n  Adipisci molestias cum tempore debitis facilis officia animi odio eligendi voluptatem numquam totam inventore deserunt obcaecati saepe fugit, eos iure id ab sint possimus, aperiam corporis optio ipsum. Ducimus, sequi.\r\n  Ratione corrupti, nisi et animi necessitatibus repellat odit neque tempore dicta vel reprehenderit tenetur adipisci commodi molestias laborum quo expedita cupiditate praesentium? Fugit nobis deleniti soluta vel harum voluptatem provident?\r\n  Doloribus, eligendi corporis ullam molestiae asperiores facere recusandae amet atque sapiente dolore nam alias tenetur hic, necessitatibus natus? Inventore natus atque voluptatem alias ipsa modi aspernatur sint fugiat quaerat sapiente.\r\n  Rerum saepe dolor laboriosam dolorum, earum eligendi animi perferendis temporibus maiores magni commodi alias quis quae iusto ullam, ipsa neque asperiores omnis! Deleniti, architecto? Deleniti amet veritatis earum velit reprehenderit.\r\n  Veritatis quisquam at, iure officiis delectus velit ipsum libero ex quia quam sapiente facilis doloribus? Reiciendis nisi quae quos quidem! Animi obcaecati dolore magni enim repellat vitae maiores fugit nisi?\r\n  Aut porro consectetur totam tempore, error, laboriosam consequuntur, voluptas nisi fugit unde vel. Omnis exercitationem nobis quos corrupti officia sapiente nostrum possimus quia fugit, reprehenderit rem, voluptates impedit laboriosam veritatis.\r\n  Eveniet, recusandae quae aut inventore quia tenetur! Corporis voluptates iure velit omnis nulla hic consequatur dicta accusantium veritatis, aut vitae voluptatem harum dolorem! Nulla dicta recusandae sunt, modi quos dolorum.\r\n  Accusantium dolores assumenda ullam numquam laudantium, beatae omnis nobis facilis quos odio, ipsam deleniti ab! Libero id sunt consequuntur aperiam. Delectus fuga molestiae incidunt unde cumque iste repudiandae dignissimos inventore?\r\n  Mollitia eligendi numquam laborum qui accusantium nihil, laudantium ut facere neque nisi aperiam quidem nobis accusamus adipisci dolores perspiciatis voluptas quos aliquam? Deleniti adipisci voluptates libero quam optio, temporibus ad.\r\n  Sunt beatae vel eligendi nihil unde odit nemo cum, tenetur, cupiditate, autem repudiandae magni sed animi modi repellat quam laboriosam optio veniam ab iure consequatur debitis aliquam dolorem? Animi, omnis.\r\n  Nemo accusamus at optio tempora veniam explicabo quas quasi odio eaque voluptatum. Libero amet corporis dolorem quidem voluptatum ex error, expedita optio ea in quo cupiditate, tempore tempora facere quasi?\r\n  Reprehenderit delectus cupiditate rerum excepturi, placeat ipsa ad minus, fuga distinctio a, porro ex labore dolorum itaque temporibus voluptatem autem! Distinctio, nobis a molestiae eveniet aspernatur consequatur exercitationem recusandae officia!\r\n  Voluptas dicta ipsum debitis! Debitis accusamus atque, sed unde sit porro, quas eaque libero, veritatis saepe cupiditate labore odio. Tempora odit obcaecati omnis esse labore delectus, maxime et ad illo.\r\n  Suscipit et exercitationem quaerat, sint, iste ipsam praesentium, obcaecati quasi sunt iure vel! Illo soluta eligendi doloribus harum corrupti corporis eveniet earum porro. Ab repellendus sunt accusamus consequatur, laborum quisquam.";
    			t7 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(h1, "class", "svelte-qulqbk");
    			add_location(h1, file$3, 5, 2, 73);
    			attr_dev(p0, "class", "svelte-qulqbk");
    			add_location(p0, file$3, 6, 2, 101);
    			attr_dev(h2, "class", "svelte-qulqbk");
    			add_location(h2, file$3, 22, 2, 3653);
    			attr_dev(p1, "class", "svelte-qulqbk");
    			add_location(p1, file$3, 23, 2, 3677);
    			attr_dev(div, "class", "svelte-qulqbk");
    			add_location(div, file$3, 4, 0, 64);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(div, t3);
    			append_dev(div, h2);
    			append_dev(div, t5);
    			append_dev(div, p1);
    			insert_dev(target, t7, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},
    		p: noop,
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
    			if (detaching) detach_dev(t7);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("OnScreen", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<OnScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Footer });
    	return [];
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

    /* src\App.svelte generated by Svelte v3.34.0 */

    function create_fragment$4(ctx) {
    	let topbar;
    	let t0;
    	let sidebar;
    	let t1;
    	let onscreen;
    	let current;
    	topbar = new TopBar({ $$inline: true });
    	sidebar = new Sidebar({ $$inline: true });
    	onscreen = new OnScreen({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(topbar.$$.fragment);
    			t0 = space();
    			create_component(sidebar.$$.fragment);
    			t1 = space();
    			create_component(onscreen.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(topbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(sidebar, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(onscreen, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topbar.$$.fragment, local);
    			transition_in(sidebar.$$.fragment, local);
    			transition_in(onscreen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topbar.$$.fragment, local);
    			transition_out(sidebar.$$.fragment, local);
    			transition_out(onscreen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(topbar, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(sidebar, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(onscreen, detaching);
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
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ TopBar, Sidebar, OnScreen });
    	return [];
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
