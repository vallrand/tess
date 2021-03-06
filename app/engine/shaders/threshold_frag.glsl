#pragma import(./template/fullscreen_frag.glsl)

uniform sampler2D uSampler;

void main(){
    vec4 color = texture(uSampler, vUV);
#ifdef BRIGHTNESS
    float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    color *= step(0.5, brightness);
#endif
#ifdef MASK
    color *= color.a;
#endif
    fragColor = vec4(color.rgb,1);
}