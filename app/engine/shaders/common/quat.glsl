vec4 quat(in vec3 axis, in float angle){return vec4(axis*sin(.5*angle),cos(.5*angle));}
vec3 qrotate(in vec4 q, in vec3 v){return v + 2.0*cross(q.xyz, cross(q.xyz,v) + q.w*v);}
vec4 qmul(vec4 a, vec4 b){return vec4(cross(a.xyz,b.xyz) + a.xyz*b.w + b.xyz*a.w, a.w*b.w - dot(a.xyz,b.xyz));}
vec4 qrandom(float u1, float u2, float u3){
    float is1 = sqrt(1.-u1); float s1 = sqrt(u1);
    return vec4(is1 * sin(TAU * u2),
        is1 * cos(TAU * u2),
        s1 * sin(TAU * u3),
        s1 * cos(TAU * u3));
}