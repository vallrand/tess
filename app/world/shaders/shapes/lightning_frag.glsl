#pragma import(../../../engine/shaders/template/fullscreen_frag.glsl)
#pragma import(../../../engine/shaders/common/hash.glsl)
#pragma import(../../../engine/shaders/common/noise.glsl)

float lightning(in vec2 uv, in float width, in float seed){
    float b = 
    (noise1D(uv.x * 4.0, 4.0, seed)-.5)*0.25+
    (noise1D(uv.x * 8.0, 8.0, seed)-.5)*0.1+
    (noise1D(uv.x * 24.0, 24.0, seed)-.5)*0.05;
    
    width *= smoothstep(0.5, 0.4, abs(uv.x));

    float l = .000025+(uv.x+.5)*.00001;
    float m = .0005/smoothstep(0., l*25e3 * width, abs(b-uv.y) + pow(0.4 * abs(uv.x), 2.4));

    return m;
}

uniform vec2 uTiles;
uniform vec4 uColor;

void main(){
    float seed = floor(vUV.x * uTiles.x) + floor(vUV.y * uTiles.y) * uTiles.x;
    vec2 uv = fract(vUV * uTiles)*2.-1.;

    float weight = lightning(uv * 0.5, 2.0, seed);
    vec3 color = vec3(0.2,0.2,0.4) * min(4.8,weight);
    float alpha = mix(color.b, 0.0, smoothstep(1.0,2.0,color.b));

    fragColor = uColor * vec4(color,alpha);
}