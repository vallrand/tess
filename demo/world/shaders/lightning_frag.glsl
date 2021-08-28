#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

#define TAU 6.283185307179586
float hash11(in float u){
    uint n = floatBitsToUint(u);
    n = (n << 13U) ^ n;
    n = n * (n * n * 15731U + 789221U) + 1376312589U;
    return float( n & 0x7fffffffU)/float(0x7fffffff);
}
float noise11(in float u, in float period, float seed){
    u *= period;
    vec2 i = mod(floor(u) + vec2(0,1),vec2(period))+seed;
    float f = fract(u); f = f*f*(3.0-2.0*f);
    return mix(hash11(i.x),hash11(i.y),f);
}
float lightning(in vec2 uv, in float width, in float seed){
    float b = 
    (noise11(uv.x, 4.0, seed)-.5)*0.25+
    (noise11(uv.x, 8.0, seed)-.5)*0.1+
    (noise11(uv.x, 24.0, seed)-.5)*0.05;
    
    width *= smoothstep(0.5, 0.4, abs(uv.x));

    float l = .000025+(uv.x+.5)*.00001;
    float m = .0005/smoothstep(0., l*25e3 * width, abs(b-uv.y) + pow(0.4 * abs(uv.x), 2.4));

    return m;
}

uniform float uTiles;

void main(){
    vec2 uv = vUV;
    float seed = floor(uv * uTiles).x + floor(uv * uTiles).y * uTiles;
    uv = fract(uv * uTiles) - 0.5;
    
    float weight = lightning(uv, 2.0, seed);
    vec3 color = vec3(0.2,0.2,0.4) * min(4.8,weight);
    float alpha = mix(color.b, 0.0, smoothstep(1.0,2.0,color.b));
    fragColor = vec4(color,alpha);
}