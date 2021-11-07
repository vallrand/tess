#pragma import(../../../engine/shaders/headers/fullscreen_frag.glsl)

vec3 fractal(in vec2 z, in float c, in float width, float radius, int layers){
    float minit=0.;
	float o,ot2,ot=ot2=1000.;
	for (int i=0; i<layers; i++) {
		z=abs(z)/clamp(dot(z,z),.1,.5)-c;
        float l=length(z);
        o=min(max(abs(min(z.x,z.y)),-l+radius),abs(l-radius));
		ot=min(ot,o);
		ot2=min(l*.1,ot2);
		minit=max(minit,float(i)*(1.-abs(sign(ot-o))));
	}
    float w=width*minit*2.;
    return vec3(minit/float(layers),(w-ot2)/w,1.*(w-ot)/w);
}

void main(){
    vec2 uv = vUV*2.-1.;
    vec2 uv0 = uv * 0.5 * 0.16;
    
    vec2 f0 = fractal(uv0, 1.2, .01, 0.2, 4).gb;
    float f1 = fractal(uv0, 1.2, 1.0, 0.0, 6).r;
    float f2 = fractal(uv0, 0.8, 1.0, 0.4, 3).r;
    float f3 = fractal(uv0, 1.0, 1.0, 0.1, 5).r;

    vec3 color = vec3(0);
    color += 0.6 * vec3(0.2,0.3,0.5) * smoothstep(0.2,1.0,f2/f1);
    color += 0.6 * vec3(0.9,0.5,0.6) * smoothstep(2.0,4.0,f2/f3);
    color = mix(color, vec3(0.2,0.6,0.7), smoothstep(0.2,1.0,f0.y));
    color = mix(color, vec3(1.0,0.6,0.7), smoothstep(0.2,1.0,f0.x));

    float edge = smoothstep(1.0,0.8,max(abs(uv.x),abs(uv.y))+min(f1,f2));

#ifdef NORMAL_MAP
    float alpha = 0.5*max(abs(uv.x),abs(uv.y))+0.5*smoothstep(-4.0,4.0,f0.y + f0.x);
    float height = (1.0-.4*max(-1e3,f0.y))*smoothstep(0.5,0.0,f0.x);
    float dhdx = dFdx(height);
    float dhdy = dFdy(height);
    vec3 normal = edge * normalize(vec3(-dhdx, -dhdy, 1));
    fragColor = vec4(0.5+0.5*normal, alpha);
#else
    color *= edge;
    float alpha = .8*smoothstep(0.75, 1.0, length(color))+.2*smoothstep(0.0,0.5,length(color));
    color = vec3(1.,0.6,0.5)*mix(color*2., color*color*4.0, smoothstep(0.5,1.0,f0.x));
    fragColor = vec4(color, alpha);
#endif
}