#define TAU 6.283185307179586

mat2 rotate(in float a){float c=cos(a),s=sin(a);return mat2(c,s,-s,c);}
vec2 polar(in vec2 uv){return vec2(atan(uv.y,uv.x)/TAU+0.5,length(uv));}
vec2 cartesian(in vec2 uv){float a=(uv.x-0.5)*TAU;return vec2(cos(a),sin(a))*uv.y;}

vec3 saturation(vec3 rgb, float adjustment){
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
}