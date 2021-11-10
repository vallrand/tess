#pragma import(./template/fullscreen_frag.glsl)

uniform sampler2D uSampler;
uniform vec2 uScreenSize;
uniform float uScale;

void main(){
    float alpha = texture(uSampler, vUV).b;
    float height = alpha / uScale;
    float dhdx = dFdx(height) * uScreenSize.x;
    float dhdy = dFdy(height) * uScreenSize.y;
    vec3 normal = normalize(vec3(-dhdx, -dhdy, 1));
    fragColor = vec4(0.5+0.5*normal, alpha);
}