import { useState, useEffect, useRef } from 'react';

/* ─── WebGL Smokey Background ────────────────────────────────────── */
const VERT_SRC = `
  attribute vec4 a_position;
  void main() { gl_Position = a_position; }
`;
const FRAG_SRC = `
precision mediump float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 uv = fragCoord / iResolution;
  vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
  float time = iTime * 0.5;
  vec2 mouse = iMouse / iResolution;
  vec2 rippleCenter = 2.0 * mouse - 1.0;
  vec2 distortion = centeredUV;
  for (float i = 1.0; i < 8.0; i++) {
    distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
    distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
  }
  float wave = abs(sin(distortion.x + distortion.y + time));
  float glow = smoothstep(0.9, 0.2, wave);
  fragColor = vec4(u_color * glow, 1.0);
}
void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }
`;

function SmokeyBg({ color = '#C29B40' }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src); gl.compileShader(sh); return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes   = gl.getUniformLocation(prog, 'iResolution');
    const uTime  = gl.getUniformLocation(prog, 'iTime');
    const uMouse = gl.getUniformLocation(prog, 'iMouse');
    const uColor = gl.getUniformLocation(prog, 'u_color');

    const r = parseInt(color.slice(1, 3), 16) / 255;
    const g = parseInt(color.slice(3, 5), 16) / 255;
    const b = parseInt(color.slice(5, 7), 16) / 255;
    gl.uniform3f(uColor, r, g, b);

    const t0 = Date.now();
    let raf: number;

    const render = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      const t = (Date.now() - t0) / 1000;
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, t);
      // Fixed center — no cursor tracking
      gl.uniform2f(uMouse, w / 2, h / 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => cancelAnimationFrame(raf);
  }, [color]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />;
}

/* ─── Eyeball ────────────────────────────────────────────────────── */
function EyeBall({
  size = 18, pupilSize = 7, maxDistance = 5,
  isBlinking = false,
  forceLookX, forceLookY,
}: {
  size?: number; pupilSize?: number; maxDistance?: number;
  isBlinking?: boolean; forceLookX?: number; forceLookY?: number;
}) {
  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { setMx(e.clientX); setMy(e.clientY); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  const pos = (() => {
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    if (!ref.current) return { x: 0, y: 0 };
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = mx - cx, dy = my - cy;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
  })();

  return (
    <div
      ref={ref}
      className="rounded-full flex items-center justify-center"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: 'white',
        overflow: 'hidden',
        transition: 'height 0.1s ease-out',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: '#1A1A1A',
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: 'transform 0.08s ease-out',
          }}
        />
      )}
    </div>
  );
}

/* ─── Animated Characters Sidebar ───────────────────────────────── */
export function AnimatedCharactersSidebar({ isTyping = false }: { isTyping?: boolean }) {
  const [goldBlink,  setGoldBlink]  = useState(false);
  const [darkBlink,  setDarkBlink]  = useState(false);
  const [lookTogether, setLookTogether] = useState(false);

  /* Random blinking */
  useEffect(() => {
    const blink = (setter: (v: boolean) => void) => {
      const t = setTimeout(() => {
        setter(true);
        setTimeout(() => { setter(false); blink(setter); }, 150);
      }, Math.random() * 4000 + 3000);
      return t;
    };
    const t1 = blink(setGoldBlink);
    const t2 = blink(setDarkBlink);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  /* Look-at-each-other on typing start */
  useEffect(() => {
    if (isTyping) {
      setLookTogether(true);
      const t = setTimeout(() => setLookTogether(false), 900);
      return () => clearTimeout(t);
    }
  }, [isTyping]);

  const [mx, setMx] = useState(0);
  const [my, setMy] = useState(0);
  useEffect(() => {
    const h = (e: MouseEvent) => { setMx(e.clientX); setMy(e.clientY); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  const lean = (el: HTMLDivElement | null) => {
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    return Math.max(-7, Math.min(7, -(mx - cx) / 100));
  };

  const goldRef  = useRef<HTMLDivElement>(null);
  const darkRef  = useRef<HTMLDivElement>(null);
  const greenRef = useRef<HTMLDivElement>(null);
  const creamRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#030304] p-10">
      {/* Smokey WebGL background */}
      <SmokeyBg color="#C29B40" />

      {/* Overlay to darken smokey effect slightly */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Top brand */}
      <div className="relative z-10 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #C29B40 0%, #E6C268 50%, #C29B40 100%)' }}
        >
          <span className="text-white font-black text-base">إ</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">
          ISLAA<span style={{ color: '#C29B40' }}>7</span>
        </span>
      </div>

      {/* Characters */}
      <div className="relative z-10 flex items-end justify-center" style={{ height: '380px' }}>
        <div className="relative" style={{ width: '420px', height: '360px' }}>

          {/* ── Gold tall (back-left) ── */}
          <div
            ref={goldRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '50px',
              width: '160px',
              height: isTyping ? '400px' : '360px',
              backgroundColor: '#C29B40',
              borderRadius: '10px 10px 0 0',
              zIndex: 1,
              transform: lookTogether
                ? `skewX(${lean(goldRef.current) - 10}deg) translateX(30px)`
                : `skewX(${lean(goldRef.current)}deg)`,
              transformOrigin: 'bottom center',
              boxShadow: '0 -4px 30px rgba(194,155,64,0.3)',
            }}
          >
            <div
              className="absolute flex gap-6 transition-all duration-700 ease-in-out"
              style={{
                left: lookTogether ? '50px' : `${42 + (isTyping ? 8 : 0)}px`,
                top: `${38 + (isTyping ? -5 : 0)}px`,
              }}
            >
              <EyeBall size={18} pupilSize={7} isBlinking={goldBlink} forceLookX={lookTogether ? 4 : undefined} forceLookY={lookTogether ? 3 : undefined} />
              <EyeBall size={18} pupilSize={7} isBlinking={goldBlink} forceLookX={lookTogether ? 4 : undefined} forceLookY={lookTogether ? 3 : undefined} />
            </div>
          </div>

          {/* ── Dark charcoal (center) ── */}
          <div
            ref={darkRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '200px',
              width: '110px',
              height: '280px',
              backgroundColor: '#1A1A24',
              borderRadius: '8px 8px 0 0',
              zIndex: 2,
              transform: lookTogether
                ? `skewX(${lean(darkRef.current) * 1.5 + 8}deg) translateX(15px)`
                : `skewX(${lean(darkRef.current)}deg)`,
              transformOrigin: 'bottom center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="absolute flex gap-5 transition-all duration-700 ease-in-out"
              style={{
                left: lookTogether ? '28px' : '24px',
                top: lookTogether ? '10px' : '28px',
              }}
            >
              <EyeBall size={15} pupilSize={6} isBlinking={darkBlink} forceLookX={lookTogether ? -2 : undefined} forceLookY={lookTogether ? -3 : undefined} />
              <EyeBall size={15} pupilSize={6} isBlinking={darkBlink} forceLookX={lookTogether ? -2 : undefined} forceLookY={lookTogether ? -3 : undefined} />
            </div>
          </div>

          {/* ── Green semicircle (front-left) ── */}
          <div
            ref={greenRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '0px',
              width: '210px',
              height: '175px',
              backgroundColor: '#00732F',
              borderRadius: '105px 105px 0 0',
              zIndex: 3,
              transform: `skewX(${lean(greenRef.current) * 0.7}deg)`,
              transformOrigin: 'bottom center',
              boxShadow: '0 -4px 20px rgba(0,115,47,0.3)',
            }}
          >
            <div
              className="absolute flex gap-7 transition-all duration-200 ease-out"
              style={{ left: '72px', top: '82px' }}
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="rounded-full"
                  style={{
                    width: '11px', height: '11px',
                    backgroundColor: '#1A1A1A',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Cream/light-gold rounded tall (front-right) ── */}
          <div
            ref={creamRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '290px',
              width: '120px',
              height: '205px',
              backgroundColor: '#E6C268',
              borderRadius: '60px 60px 0 0',
              zIndex: 4,
              transform: `skewX(${lean(creamRef.current) * 0.8}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            <div
              className="absolute flex gap-5 transition-all duration-200 ease-out"
              style={{ left: '44px', top: '36px' }}
            >
              {[0, 1].map((i) => (
                <div key={i} className="rounded-full" style={{ width: '11px', height: '11px', backgroundColor: '#1A1A1A' }} />
              ))}
            </div>
            {/* Mouth */}
            <div
              className="absolute rounded-full transition-all duration-200 ease-out"
              style={{ width: '38px', height: '3px', backgroundColor: '#1A1A1A', left: '40px', top: '80px' }}
            />
          </div>

        </div>
      </div>

      {/* Bottom tagline */}
      <div className="relative z-10 space-y-1">
        <p className="text-white/50 text-xs font-bold tracking-widest uppercase">
          Repair · Reward · Renew
        </p>
        <p className="text-white/30 text-xs">
          Sustainable repair platform · UAE
        </p>
      </div>
    </div>
  );
}
