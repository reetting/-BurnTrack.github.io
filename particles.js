(function () {
    // Prevent double injection
    if (document.querySelector('.fire-particles-bg')) return;

    // ─── Canvas Setup ───────────────────────────────────────────────
    const canvas = document.createElement('canvas');
    canvas.className = 'fire-particles-bg';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    canvas.style.display = 'block';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W, H; // logical dimensions

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    // ─── Mouse Tracking ─────────────────────────────────────────────
    const mouse = { x: -9999, y: -9999, active: false };
    const MOUSE_RADIUS = 140;
    const MOUSE_FORCE = 0.35;

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
    });
    document.addEventListener('mouseleave', () => {
        mouse.active = false;
    });

    // ─── Utility ────────────────────────────────────────────────────
    const rand = (min, max) => Math.random() * (max - min) + min;
    const lerp = (a, b, t) => a + (b - a) * t;
    const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

    // ─── Adaptive Particle Counts ───────────────────────────────────
    function counts() {
        const area = W * H;
        const scale = Math.min(area / 1_200_000, 1); // normalize to ~1920×625
        return {
            embers: Math.max(8, Math.min(35, Math.round(35 * scale))),
            sparks: Math.max(6, Math.min(45, Math.round(45 * scale))),
            smoke:  Math.max(4, Math.min(25, Math.round(25 * scale))),
        };
    }

    // ─── Global Time ────────────────────────────────────────────────
    let time = 0;

    // ═══════════════════════════════════════════════════════════════
    //  LAYER 1 — Deep Embers
    // ═══════════════════════════════════════════════════════════════
    class Ember {
        constructor(initial) { this.reset(initial); }

        reset(initial = false) {
            this.x = rand(0, W);
            this.y = initial ? rand(H * 0.3, H) : H + rand(10, 60);
            this.radius = rand(2.5, 5.5);
            this.baseRadius = this.radius;
            this.vy = -rand(0.2, 0.6);
            this.vx = rand(-0.15, 0.15);
            this.wobbleAmp = rand(0.5, 2.0);
            this.wobbleFreq = rand(0.008, 0.025);
            this.wobbleOffset = rand(0, Math.PI * 2);
            this.hue = rand(5, 35);
            this.sat = rand(85, 100);
            this.light = rand(40, 60);
            this.alpha = rand(0.25, 0.6);
            this.maxAlpha = this.alpha;
            this.decay = rand(0.0004, 0.0012);
            this.pulseSpeed = rand(0.015, 0.04);
            this.pulseOffset = rand(0, Math.PI * 2);
            // Burst state
            this.bursting = false;
            this.burstTimer = 0;
            this.burstCooldown = rand(400, 1200);
        }

        update() {
            // Occasional burst
            this.burstCooldown--;
            if (!this.bursting && this.burstCooldown <= 0 && Math.random() < 0.004) {
                this.bursting = true;
                this.burstTimer = rand(30, 70);
            }
            if (this.bursting) {
                this.vy -= 0.06;
                this.burstTimer--;
                if (this.burstTimer <= 0) {
                    this.bursting = false;
                    this.burstCooldown = rand(400, 1200);
                }
            }

            this.y += this.vy;
            this.x += this.vx + Math.sin(time * this.wobbleFreq + this.wobbleOffset) * this.wobbleAmp * 0.3;
            this.alpha -= this.decay;

            // Pulse radius
            this.radius = this.baseRadius + Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.8;

            // Mouse interaction — gentle repulsion
            if (mouse.active) {
                const d = dist(this.x, this.y, mouse.x, mouse.y);
                if (d < MOUSE_RADIUS && d > 0) {
                    const force = (1 - d / MOUSE_RADIUS) * MOUSE_FORCE;
                    this.x += ((this.x - mouse.x) / d) * force;
                    this.y += ((this.y - mouse.y) / d) * force * 0.5;
                }
            }

            if (this.y < -20 || this.alpha <= 0 || this.x < -30 || this.x > W + 30) {
                this.reset(false);
            }
        }

        draw() {
            const pulse = 0.7 + 0.3 * Math.sin(time * this.pulseSpeed + this.pulseOffset);
            const a = Math.max(0, this.alpha * pulse);
            if (a < 0.01) return;

            ctx.save();
            ctx.globalAlpha = a;
            ctx.shadowBlur = this.radius * 8;
            ctx.shadowColor = `hsla(${this.hue}, ${this.sat}%, ${this.light + 10}%, ${a * 0.9})`;
            ctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.radius), 0, Math.PI * 2);
            ctx.fill();

            // Inner hot core
            ctx.shadowBlur = 0;
            ctx.globalAlpha = a * 0.6;
            ctx.fillStyle = `hsl(${this.hue + 10}, 100%, ${this.light + 25}%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.3, this.radius * 0.4), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  LAYER 2 — Sparks (with trails)
    // ═══════════════════════════════════════════════════════════════
    const TRAIL_LENGTH = 8;

    class Spark {
        constructor(initial) { this.trail = []; this.reset(initial); }

        reset(initial = false) {
            this.x = rand(W * 0.1, W * 0.9);
            this.y = initial ? rand(H * 0.4, H) : H + rand(5, 30);
            this.radius = rand(0.6, 1.8);
            this.vy = -rand(1.0, 3.0);
            this.vx = rand(-0.8, 0.8);
            this.gravity = rand(-0.005, 0.005); // very slight lateral drift
            this.hue = rand(25, 55);
            this.light = rand(70, 95);
            this.alpha = rand(0.5, 0.9);
            this.decay = rand(0.004, 0.012);
            this.life = 1;
            this.trail.length = 0;
            this.flickerSpeed = rand(0.1, 0.3);
        }

        update() {
            // Store trail
            this.trail.push({ x: this.x, y: this.y, a: this.alpha * this.life });
            if (this.trail.length > TRAIL_LENGTH) this.trail.shift();

            this.vy *= 0.998;
            this.vx += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;

            // Mouse — sparks are attracted slightly
            if (mouse.active) {
                const d = dist(this.x, this.y, mouse.x, mouse.y);
                if (d < MOUSE_RADIUS * 1.3 && d > 0) {
                    const force = (1 - d / (MOUSE_RADIUS * 1.3)) * 0.15;
                    this.vx += ((mouse.x - this.x) / d) * force;
                    this.vy += ((mouse.y - this.y) / d) * force * 0.3;
                }
            }

            if (this.life <= 0 || this.y < -20 || this.x < -20 || this.x > W + 20) {
                this.reset(false);
            }
        }

        draw() {
            // Trail
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const progress = i / this.trail.length;
                const a = t.a * progress * 0.35;
                if (a < 0.01) continue;
                ctx.save();
                ctx.globalAlpha = a;
                ctx.fillStyle = `hsl(${this.hue}, 100%, ${this.light}%)`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, this.radius * progress * 0.7, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Spark head
            const flicker = 0.6 + 0.4 * Math.sin(time * this.flickerSpeed + this.x);
            const a = Math.max(0, this.alpha * this.life * flicker);
            if (a < 0.01) return;

            ctx.save();
            ctx.globalAlpha = a;
            ctx.shadowBlur = this.radius * 12;
            ctx.shadowColor = `hsla(${this.hue}, 100%, 85%, ${a * 0.8})`;
            ctx.fillStyle = `hsl(${this.hue}, 100%, ${this.light}%)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  LAYER 3 — Heat Shimmer / Smoke Wisps
    // ═══════════════════════════════════════════════════════════════
    class Smoke {
        constructor(initial) { this.reset(initial); }

        reset(initial = false) {
            this.x = rand(-50, W + 50);
            this.y = initial ? rand(H * 0.2, H) : H + rand(20, 100);
            this.radius = rand(25, 70);
            this.vy = -rand(0.1, 0.35);
            this.vx = rand(-0.1, 0.1);
            this.alpha = rand(0.015, 0.045);
            this.maxAlpha = this.alpha;
            this.decay = rand(0.00005, 0.00015);
            this.rotation = rand(0, Math.PI * 2);
            this.rotSpeed = rand(-0.003, 0.003);
            this.scaleX = rand(0.8, 1.4);
            this.scaleY = rand(0.6, 1.0);
            this.hue = rand(15, 40);
            this.driftFreq = rand(0.003, 0.01);
            this.driftAmp = rand(0.3, 1.2);
            this.driftOffset = rand(0, Math.PI * 2);
        }

        update() {
            this.y += this.vy;
            this.x += this.vx + Math.sin(time * this.driftFreq + this.driftOffset) * this.driftAmp * 0.15;
            this.rotation += this.rotSpeed;
            this.alpha -= this.decay;

            // Slight mouse displacement
            if (mouse.active) {
                const d = dist(this.x, this.y, mouse.x, mouse.y);
                if (d < MOUSE_RADIUS * 2 && d > 0) {
                    const force = (1 - d / (MOUSE_RADIUS * 2)) * 0.08;
                    this.x += ((this.x - mouse.x) / d) * force;
                }
            }

            if (this.y < -this.radius * 2 || this.alpha <= 0) {
                this.reset(false);
            }
        }

        draw() {
            const breathe = 0.7 + 0.3 * Math.sin(time * 0.008 + this.driftOffset);
            const a = Math.max(0, this.alpha * breathe);
            if (a < 0.003) return;

            ctx.save();
            ctx.globalAlpha = a;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.scaleX, this.scaleY);

            // Soft radial gradient for smoky look
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, `hsla(${this.hue}, 30%, 50%, 0.5)`);
            grad.addColorStop(0.4, `hsla(${this.hue}, 20%, 35%, 0.2)`);
            grad.addColorStop(1, `hsla(${this.hue}, 10%, 20%, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  Interconnecting Lines (neural-network style, warm)
    // ═══════════════════════════════════════════════════════════════
    const LINE_DIST = 130;

    function drawConnections(embers) {
        const len = embers.length;
        for (let i = 0; i < len; i++) {
            const a = embers[i];
            if (a.alpha < 0.1) continue;
            for (let j = i + 1; j < len; j++) {
                const b = embers[j];
                if (b.alpha < 0.1) continue;
                const d = dist(a.x, a.y, b.x, b.y);
                if (d < LINE_DIST) {
                    const strength = (1 - d / LINE_DIST) * Math.min(a.alpha, b.alpha) * 0.25;
                    if (strength < 0.01) continue;
                    ctx.save();
                    ctx.globalAlpha = strength;
                    ctx.strokeStyle = `hsla(25, 90%, 55%, 1)`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  Ambient Pulsating Glow (bottom-center warm light)
    // ═══════════════════════════════════════════════════════════════
    function drawAmbientGlow() {
        const pulse = 0.4 + 0.25 * Math.sin(time * 0.006) + 0.1 * Math.sin(time * 0.0023);
        const radius = Math.max(W, H) * 0.7;

        ctx.save();
        ctx.globalAlpha = pulse * 0.12;
        const grad = ctx.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, radius);
        grad.addColorStop(0, 'hsla(20, 100%, 50%, 1)');
        grad.addColorStop(0.3, 'hsla(15, 90%, 35%, 0.6)');
        grad.addColorStop(0.6, 'hsla(10, 80%, 20%, 0.2)');
        grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Vignette Overlay
    // ═══════════════════════════════════════════════════════════════
    function drawVignette() {
        const cx = W * 0.5;
        const cy = H * 0.5;
        const outerR = Math.hypot(cx, cy);

        ctx.save();
        const grad = ctx.createRadialGradient(cx, cy, outerR * 0.35, cx, cy, outerR);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    // ═══════════════════════════════════════════════════════════════
    //  Initialise Particles
    // ═══════════════════════════════════════════════════════════════
    const c = counts();
    const embers = [];
    const sparks = [];
    const smokes = [];

    for (let i = 0; i < c.embers; i++) embers.push(new Ember(true));
    for (let i = 0; i < c.sparks; i++) sparks.push(new Spark(true));
    for (let i = 0; i < c.smoke; i++)  smokes.push(new Smoke(true));

    // ─── Handle Resize (re-balance counts) ──────────────────────────
    let resizeDebounce = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeDebounce);
        resizeDebounce = setTimeout(() => {
            const nc = counts();
            // Adjust ember pool
            while (embers.length < nc.embers) embers.push(new Ember(true));
            while (embers.length > nc.embers) embers.pop();
            // Adjust spark pool
            while (sparks.length < nc.sparks) sparks.push(new Spark(true));
            while (sparks.length > nc.sparks) sparks.pop();
            // Adjust smoke pool
            while (smokes.length < nc.smoke) smokes.push(new Smoke(true));
            while (smokes.length > nc.smoke) smokes.pop();
        }, 250);
    });

    // ═══════════════════════════════════════════════════════════════
    //  Main Animation Loop
    // ═══════════════════════════════════════════════════════════════
    function animate() {
        time++;
        ctx.clearRect(0, 0, W, H);

        // 1. Ambient glow (bottom layer)
        drawAmbientGlow();

        // 2. Smoke wisps (behind everything)
        for (let i = 0; i < smokes.length; i++) {
            smokes[i].update();
            smokes[i].draw();
        }

        // 3. Connections between embers
        drawConnections(embers);

        // 4. Deep embers
        for (let i = 0; i < embers.length; i++) {
            embers[i].update();
            embers[i].draw();
        }

        // 5. Sparks on top
        for (let i = 0; i < sparks.length; i++) {
            sparks[i].update();
            sparks[i].draw();
        }

        // 6. Vignette (top layer)
        drawVignette();

        requestAnimationFrame(animate);
    }

    animate();
})();
