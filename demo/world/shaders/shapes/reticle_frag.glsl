#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/math.glsl)

uniform vec4 uColor;

void main(){
    vec2 uv = 2.*vUV-1.;

    const float edge = 0.02;
    vec2 uvp = polar(uv);
    uvp.y *= max(abs(uv.x),abs(uv.y)) * 1.2;
    float outer = smoothstep(.9,.9-edge,uvp.y)*smoothstep(.7-edge,.7,uvp.y);
    outer *= smoothstep(.7,.7-edge,abs(fract(uvp.x*4.)*2.-1.));
    float plus = smoothstep(.04+edge,.04,min(abs(uv.x),abs(uv.y)));
    plus = max(0., plus - smoothstep(.04,.04-edge,uvp.y));
    float inner = smoothstep(.3,.3-edge,uvp.y)*smoothstep(.2-edge,.2,uvp.y);
    inner = max(0., inner - smoothstep(.1+edge,.1,min(abs(uv.x),abs(uv.y))));
    float alpha = plus + outer + inner;

    fragColor = uColor * alpha;
}