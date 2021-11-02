#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    uv = abs(uv);
    uv += mix(0.0,-0.16*(1.0-max(uv.x,uv.y)),max(uv.x,uv.y));
    float sparkle = max(0.0, 1.0 - (16.0*uv.x*uv.y + 0.8*(uv.x+uv.y)));
    sparkle = pow(1.0/(1.0-sparkle),0.2) - 1.0;
    float alpha = sparkle * 2.0;

    fragColor = uColor * alpha;
}