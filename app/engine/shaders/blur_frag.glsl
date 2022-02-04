#pragma import(./template/fullscreen_frag.glsl)
#pragma import(./common/gauss_blur.glsl)

uniform sampler2D uSampler;
uniform vec2 uSize;

void main(){
    fragColor = blur(uSampler, uSize);
}