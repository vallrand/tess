#version 300 es
precision highp float;
in vec2 vUV;
in vec2 vLife;
in vec3 vPosition;
out vec4 fragColor;

uniform sampler2D uSampler;
uniform sampler2D uGradient;

uniform GlobalUniforms {
    vec4 uTime;
};

#define TAU 6.283185307179586
float sineNoise(vec2 uv, int layers, float shift){
    vec2 p = vec2(uv); float v = 0.0;
	for(int i=0;i<layers;i++){
		float t = shift * (.75+.25*sin(float(i+1)*43758.5453));
        uv.y -= t;
		p = uv + vec2(cos(t - p.x) + sin(t + p.y), sin(t - p.y) + cos(t + p.x));
        v += 1.0/length(1.0/vec2(sin(p.x+t), cos(p.y+t)));
	}
    v = smoothstep(1.0,0.0,v / float(layers));
    return pow(v,1.4);
}

void main(void){
    vec2 uv = vUV;

    float alpha = sineNoise(uv*TAU, 4, 411.37+uTime.x+0.2*vPosition.y);
    vec4 color = vec4(mix(smoothstep(0.0,0.8,alpha), smoothstep(0.2,1.0,alpha), vLife.x));

#ifdef GRADIENT
    color = texture(uGradient, vec2(vLife.x, color.a));
#else
    color *= 4.*vLife.x*(1.-vLife.x);
#endif
#ifdef MASK
    color *= smoothstep(1.0,0.5,length(2.*uv-1.));
#endif
    fragColor = color;
}