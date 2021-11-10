#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    uv = abs(uv);
    float x0 = 1.0-uv.x*uv.x;
    float x1 = 1.0-uv.x;
    float y0 = mix(pow(1.0-uv.y,8.0), pow(1.0-uv.y,2.0), x1*x1);
    float alpha = smoothstep(0.0, 1.0, x0*y0);

    fragColor = uColor * alpha;
}