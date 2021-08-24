#version 300 es
precision highp float;
precision highp int;

in vec2 vUV;
in vec3 vPosition;
in vec4 vColor;
in vec4 vMaterial;

out vec4 fragColor;

uniform sampler2D uSampler;

uniform GlobalUniforms {
    vec4 uTime;
};

void main(){
    vec2 uv = vUV;
    float c0 = texture(uSampler, uv).r;
    float c1 = texture(uSampler, uv + vec2(0,-0.2*2.0*uTime.x)).g;
    float c2 = texture(uSampler, uv + vec2(0,-0.4*2.0*uTime.x)).b;
    float c = c0*c1*c2*8.;
    vec4 color = mix(vec4(0), vec4(0.1,0.3,0.3,0.5), c);
    color = mix(color, vec4(0.4,0.6,0.7,0.2), smoothstep(0.5,4.0,c));
    color = mix(color, vec4(1.0,1.0,1.0,0.0), smoothstep(1.0,6.0,c));
    
    fragColor = color * vColor;
}