vec4 blur(in sampler2D map, in vec2 size){
    vec4 color = vec4(0);
    vec2 offset = size / vec2(textureSize(map, 0));
#if KERNEL_SIZE == 13
    vec2 off1 = vec2(1.411764705882353) * offset;
    vec2 off2 = vec2(3.2941176470588234) * offset;
    vec2 off3 = vec2(5.176470588235294) * offset;
    color += texture(map, vUV) * 0.1964825501511404;
    color += texture(map, vUV + off1) * 0.2969069646728344;
    color += texture(map, vUV - off1) * 0.2969069646728344;
    color += texture(map, vUV + off2) * 0.09447039785044732;
    color += texture(map, vUV - off2) * 0.09447039785044732;
    color += texture(map, vUV + off3) * 0.010381362401148057;
    color += texture(map, vUV - off3) * 0.010381362401148057;
#elif KERNEL_SIZE == 9
    vec2 off1 = vec2(1.3846153846) * offset;
    vec2 off2 = vec2(3.2307692308) * offset;
    color += texture(map, vUV) * 0.2270270270;
    color += texture(map, vUV + off1) * 0.3162162162;
    color += texture(map, vUV - off1) * 0.3162162162;
    color += texture(map, vUV + off2) * 0.0702702703;
    color += texture(map, vUV - off2) * 0.0702702703;
#elif KERNEL_SIZE == 5
    vec2 off1 = vec2(1.3333333333333333) * offset;
    color += texture(map, vUV) * 0.29411764705882354;
    color += texture(map, vUV + off1) * 0.35294117647058826;
    color += texture(map, vUV - off1) * 0.35294117647058826;
#endif
    return color;
}


    