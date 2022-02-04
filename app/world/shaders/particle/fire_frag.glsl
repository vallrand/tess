#version 300 es
precision highp float;

in vec2 vUV;
in vec4 vUVClamp;
in vec2 vLife;
in vec3 vPosition;

out vec4 fragColor;

uniform sampler2D uSampler;
uniform sampler2D uGradient;

uniform GlobalUniforms {
    vec4 uTime;
};

void main(void){
    vec2 uv = vUV.yx;
    float time = -uTime.x * 1.6 + 1891.87 * vLife.y;
    uv.x = mix(.5+2.0*(uv.x-.5), uv.x, smoothstep(0.0,0.5,uv.y));
    float n0 = texture(uSampler, 0.2*(uv+0.7*vLife.y) + vec2(0,0.05*time)).r;
    float n1 = texture(uSampler, 0.5*(uv+0.9*vLife.y) + vec2(0,0.2*time + 0.2*n0)).r;
    float n2 = texture(uSampler, 1.0*(uv+0.5*vLife.y)*mix(0.8,1.0,n1) + vec2(0,0.5*time - 0.4*n0)).r;
    
    uv=vUV*2.-1.;
    float fade = pow(4.*vLife.x*(1.-vLife.x)-1.,2.);
    float n = pow(max(0.,length(uv) + n2 + fade),4.0);
    n = max(0.,smoothstep(0.6,0.0,n)-n);
    vec4 color = vec4(1.5*n,1.5*n*n,n*n*n,0.2*n).brga;

    fragColor = color;
}