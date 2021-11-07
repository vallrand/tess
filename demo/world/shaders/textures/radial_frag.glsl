#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)

uniform vec2 uRadius;
uniform vec2 uSegments;
uniform vec4 uColor;
uniform vec2 uAngle;
uniform vec4 uStrokeColor;
uniform float uStrokeWidth;

void main(){
    vec2 uv = vUV*2.-1.;
    vec2 uvp = polar(uv);
    float d = max(uRadius.x - uvp.y, uvp.y - uRadius.y);
    uvp.x = max(0.0, uvp.x * uAngle.y + 1.0 - uAngle.y);
    float angle = TAU * (round(uvp.x * uSegments.y)/uSegments.y - 0.25);
    uv = cartesian(uvp);
    uv *= rotate(angle);
    d = max(d, uAngle.x-abs(uv.x)-step(0.0,uv.y));
    
    vec4 color = uColor * step(d, 0.0);
    color = mix(uStrokeColor, color, smoothstep(0.0, uStrokeWidth, abs(d)));
    color *= step(ceil(uvp.x * uSegments.y), uSegments.x);

    if(color.a <= 0.0 || uSegments.x < 1.0) discard;
    fragColor = color;
}