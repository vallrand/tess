#version 300 es
precision highp float;
#define PI 3.141592653589793

uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
#ifdef OMNILIGHT
uniform LightUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uRadius;
    float uIntensity;
};
#endif

uniform sampler2D uAlbedoBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uPositionBuffer;

layout(location=0) out vec4 fragColor;

//Normal Distribution Functions
float ndfBlinnPhong(in float NdH, in float alpha){
    float n = 2.0 / (alpha * alpha) - 2.0;
    return pow(NdH, n) * (n + 2.0) / (2.0 * PI);
}
float ndfPhong(in vec3 L, in vec3 N, in vec3 V, in float alpha){
    vec3 R = reflect(-L, N);
    float VdR = max(0.0, dot(V, R));
    float n = 2.0 / (alpha * alpha) - 2.0;
    return pow(VdR, n) * (n + 2.0) / (2.0 * PI);
}
float ndfBeckmann(in float NdH, in float alpha){
    float a2 = alpha*alpha;
    float NdH2 = NdH*NdH;
    return exp((NdH2 - 1.0) / (a2 * NdH2)) / (PI * a2 * NdH2 * NdH2);
}
float ndfGGX(in float NdH, in float alpha){
    float a2 = alpha*alpha;
    float denom = (NdH*NdH) * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}

//Geometric Shadowing Functions
float gsfImplicit(in float NdL, in float NdV){return NdL*NdV;}
float gsfKalemen(in float NdV, in float NdL, in float alpha){
    const float c = sqrt(2./PI);
    float k = alpha * alpha * c;
    float gH = NdV * k +(1.-k);
	return gH * gH * NdL;
}
float gsfCookTorrence(in float NdL, in float NdV, in float VdH, in float NdH){
    return min(1., min(2.*NdH*NdV / VdH, 2.*NdH*NdL / VdH));
}
float gsfWalter(in float NdL, in float NdV, in float alpha){
    float a2 = alpha*alpha;
    float L = (2.*NdL)/(NdL + sqrt(a2 + (1.-a2) * NdL*NdL));
    float V = (2.*NdV)/(NdV + sqrt(a2 + (1.-a2) * NdV*NdV));
    return L * V;
}
float gsfSchlick(in float NdL, in float NdV, in float alpha){
#if defined(BECKMANN)
    float a2 = alpha * alpha;
    float k = a2 * 0.797884560802865;
#elif defined(GGX)
    float k = alpha * 0.5;
#else
    float k = alpha * alpha;
#endif
    float V = NdV / (NdV * (1.0 - k) + k);
    float L = NdL / (NdL * (1.0 - k) + k);
    return V * L;
}

vec3 fresnelSchlick(vec3 F0, float cosTheta){
    return mix(F0, vec3(1.0), pow(1.0 - cosTheta, 5.0));
}
vec3 fresnelSchlick(vec3 F0, float cosTheta, float roughness){
    return mix(F0, max(vec3(1.0-roughness), F0), pow(1.0 - cosTheta, 5.0));
}

void main(){
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec3 position = texelFetch(uPositionBuffer, fragCoord, 0).xyz;
    vec4 normal = texelFetch(uNormalBuffer, fragCoord, 0);
    vec4 albedo = texelFetch(uAlbedoBuffer, fragCoord, 0);
    float emission = max(0.,2.*albedo.a-1.);
    float roughness = clamp(2.*albedo.a,0.04,1.0);
    float metalness = normal.a;

#ifdef OMNILIGHT
    vec3 lightPosition = vec3(uModelMatrix[3]);
    float attenuation = smoothstep(-uRadius, 0.0, -length(lightPosition - position));
    vec3 light = attenuation * uIntensity * uColor.rgb;
    light = mix(light,vec3(0),emission);
#endif

    vec3 N = normalize(normal.xyz);
    vec3 V = normalize(uEyePosition - position);
    vec3 L = normalize(lightPosition - position);
    vec3 H = normalize(L + V);

    float NdL = max(0.001, dot(N, L));
    float NdV = max(0.001, dot(N, V));
    float NdH = max(0.001, dot(N, H));
    float HdV = max(0.001, dot(H, V));

    vec3 F0 = mix(vec3(0.04), albedo.rgb, metalness);
    float alpha = roughness*roughness;

#ifdef PHONG
    vec3 F = fresnelSchlick(F0, NdV);
#else
    vec3 F = fresnelSchlick(F0, HdV);
#endif
#if defined(BLINN)
    float D = ndfBlinnPhong(NdH, alpha);
#elif defined(PHONG)
    float D = ndfPhong(N, L, V, alpha);
#elif defined(BECKMANN)
    float D = ndfBeckmann(NdH, alpha);
#elif defined(GGX)
    float D = ndfGGX(NdH, alpha);
#endif

#if defined(SCHLICK)
    float G = gsfSchlick(NdL, NdV, alpha);
#elif defined(KALEMEN)
    float G = gsfKalemen(NdV, NdL, alpha);
#elif defined(WALTER)
    float G = gsfWalter(NdL, NdV, alpha);
#else
    float G = gsfImplicit(NdL, NdV);
#endif
    vec3 specular = (F * D * G) / (4.0 * NdL * NdV);
    vec3 diffuse = albedo.rgb * mix(vec3(1.0) - F, vec3(0.0), metalness);

    fragColor = vec4(NdL*light*(diffuse+specular),0.);
}