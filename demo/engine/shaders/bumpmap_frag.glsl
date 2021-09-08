#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uSampler;
uniform vec2 uScreenSize;
uniform float uScale;

void main(){
    float alpha = texture(uSampler, vUV).b;
    float height = alpha / uScale;
    //vec2 screenSize = vec2(textureSize(uSampler));
    float dhdx = dFdx(height) * uScreenSize.x;
    float dhdy = dFdy(height) * uScreenSize.y;
    vec3 normal = normalize(vec3(-dhdx, -dhdy, 1));
#ifdef PREMULTIPLY
    normal.rgb *= smoothstep(0.0,0.8,alpha);
#endif
    fragColor = vec4(0.5+0.5*normal, alpha);
}