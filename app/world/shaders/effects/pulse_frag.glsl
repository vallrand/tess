#version 300 es
precision highp float;
precision highp int;

in vec3 vPosition;
in vec3 vNormal; 
in vec2 vUV;

layout(location=0) out vec4 fragColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform ModelUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uLayer;
    float uStartTime;
};
uniform sampler2D uPositionBuffer;
uniform sampler2D uAlbedoBuffer;

#define TAU 6.283185307179586
float hash13(in vec3 uv){
    uvec3 q = floatBitsToUint(uv);
	q *= uvec3(1597334673U, 3812015801U, 2798796415U);
	uint n = (q.x ^ q.y ^ q.z) * 1597334673U;
	return float(n) * (1.0 / float(0xffffffffU));
}
float noise3D(in vec3 x){
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash13(i+vec3(0,0,0)), 
                       hash13(i+vec3(1,0,0)),f.x),
                   mix(hash13(i+vec3(0,1,0)), 
                       hash13(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash13(i+vec3(0,0,1)), 
                       hash13(i+vec3(1,0,1)),f.x),
                   mix(hash13(i+vec3(0,1,1)), 
                       hash13(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(in vec3 p, in int layers){
    float f = 0.0, scale = 0.5;
    for(int i=0;i<layers;i++){
        float n = noise3D(p);
        f += scale * abs(n*2.-1.);
        scale *= 0.5;
        p = p * 1.6;
    }
    return f;
}

vec3 saturation(vec3 rgb, float adjustment){
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
}
float sine(in float x){return .5-.5*cos(x*TAU);}

void main(){
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - vPosition);
    float NdV = dot(normal, view);

    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec2 uv = vec2(gl_FragCoord.xy) / vec2(textureSize(uAlbedoBuffer, 0));
    vec4 fragPosition = texelFetch(uPositionBuffer, fragCoord, 0);
    vec3 viewNormal = (uViewMatrix * vec4(normal, 0.0)).xyz;

    vec3 center = uModelMatrix[3].xyz;
    float radius = length(vPosition - center);
    vec3 relativePosition = fragPosition.xyz + uEyePosition - center;
    float distance = radius - length(relativePosition);
    if(distance <= 0.0) discard;

    vec2 uvOffset = viewNormal.rg * 0.24 * sine(min(1.0,distance*0.4));
    uvOffset *= min(1.0, 4.0 / length(relativePosition));
    vec4 dstColor = texture(uAlbedoBuffer, uv + uvOffset);

    vec3 color = saturation(dstColor.rgb, smoothstep(1.0,0.0,distance*0.4));

    float alpha = 1.0;
    fragColor = uColor * vec4(alpha * color, alpha);
}