#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform vec2 uScreenSize;

#define TAU 6.283185307179586
#define RESOLUTION 1.0
#define MAP_SCALE 10.0

vec2 hash22(ivec2 iv, float period){
    vec2 p = mod(vec2(iv), period * RESOLUTION);
    return fract(vec2(2097152, 262144)*sin(dot(p, vec2(113, 1))))*2.-1.;
}
mat2 rotate(in float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
float gradN2D(in vec2 value, float period){ 
    const ivec2 ie = ivec2(0, 1);
    const vec2 fe = vec2(0, 1);
    ivec2 p = ivec2(floor(value));
    vec2 f = fract(value);
    vec2 w = f*f*(3. - 2.*f); 
    float c = mix(mix(dot(hash22(p + ie.xx,period), f - fe.xx), dot(hash22(p + ie.yx,period), f - fe.yx), w.x),
                  mix(dot(hash22(p + ie.xy,period), f - fe.xy), dot(hash22(p + ie.yy,period), f - fe.yy), w.x), w.y);
    return c*.5 + .5;
}
float stripes(float x, float offset){
    x = 2.*abs(fract(x/6.283185307179586+offset-.25)-.5);
    float x2 = clamp(x*x*(2.*x-1.),0.,1.);
    return mix(smoothstep(0.,1.,x),x2,0.15);
}
float sandLayer(vec2 p, float lines){
    vec2 q = rotate(atan(1.0/lines,1.0))*p;
    q.y += (gradN2D(p*18.,18.0) - .5)*.05;
    float grad1 = stripes(q.y*lines*TAU, 0.);
   
    q = rotate(-atan(1.0/lines,1.0))*p;
    q.y += (gradN2D(p*12.,12.0) - .5)*.05;
    float grad2 = stripes(q.y*lines*TAU, .5);
      
    q = vec2(p.x+p.y,-p.x+p.y);
    
    float a2 = dot(sin(q*2.*TAU - cos(q.yx*2.*TAU)), vec2(.25)) + .5;
    float a1 = 1. - a2;
    
    float c = 1. - (1. - grad1*a1)*(1. - grad2*a2);
    return c;
}

vec3 calculateNormal(in float height){
    float dhdx = dFdx(height) * uScreenSize.x;
    float dhdy = dFdy(height) * uScreenSize.y;
    vec3 normal = normalize(vec3(-dhdx, -dhdy, 1));
    return 0.5+0.5*normal;
}

void main(){
    vec2 uv = vUV * RESOLUTION;
    float layer0 = sandLayer(uv, 10.);
    float layer1 = sandLayer(uv + gradN2D(uv*7.,7.)*.2, 7.);
    float height = mix(layer0, layer1, smoothstep(.1,.9, gradN2D(uv*2.0+128.0,2.0)));

    float fbm0 = gradN2D(uv.yx*16.,16.)*.5+gradN2D(uv.yx*32.,32.)*.3+gradN2D(uv.yx*64.,64.)*.2;
    height += 0.1*(fbm0*2.-1.);
    height *= 0.16;

    fragColor = vec4(calculateNormal(height / MAP_SCALE), height);
}