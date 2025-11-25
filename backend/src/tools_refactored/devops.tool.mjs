/**
 *  DevOps Tool
 * Provides tools for continuous integration, deployment, and infrastructure management.
 * @version 2.0.0 - Refactored for ToolManager Compliance
 */

class DevOpsTool {
    constructor(dependencies) {
        this.docker = dependencies.docker;
        this.kubernetes = dependencies.kubernetes; // Assuming a Kubernetes client is passed in
        this.initializeMetadata();
    }

    initializeMetadata() {
        this.buildDockerImage.metadata = {
            name: "buildDockerImage",
            description: "Build a Docker image from a Dockerfile in a specified context path.",
            parameters: {
                type: "object",
                properties: {
                    contextPath: { type: "string", description: "The path to the build context." },
                    dockerfile: { type: "string", description: "The name of the Dockerfile." },
                    imageTag: { type: "string", description: "The tag for the new Docker image." }
                },
                required: ["contextPath", "dockerfile", "imageTag"]
            }
        };

        this.pushDockerImage.metadata = {
            name: "pushDockerImage",
            description: "Push a Docker image to a container registry.",
            parameters: {
                type: "object",
                properties: {
                    imageTag: { type: "string", description: "The tag of the image to push." }
                },
                required: ["imageTag"]
            }
        };
    }

    async buildDockerImage({ contextPath, dockerfile, imageTag }) {
        if (!this.docker) return { success: false, error: "Docker dependency not available." };
        try {
            const stream = await this.docker.buildImage({
                context: contextPath,
                src: [dockerfile]
            }, { t: imageTag });

            await new Promise((resolve, reject) => {
                this.docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
            });

            return { success: true, message: `Image ${imageTag} built successfully.` };
        } catch (error) {
            console.error(`Failed to build Docker image: ${error.message}`);
            return { success: false, error: `Failed to build Docker image: ${error.message}` };
        }
    }

    async pushDockerImage({ imageTag }) {
        if (!this.docker) return { success: false, error: "Docker dependency not available." };
        try {
            const image = this.docker.getImage(imageTag);
            const stream = await image.push({ "authconfig": { "username": process.env.DOCKER_HUB_USERNAME, "password": process.env.DOCKER_HUB_PASSWORD } });

            await new Promise((resolve, reject) => {
                this.docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
            });

            return { success: true, message: `Image ${imageTag} pushed successfully.` };
        } catch (error) {
            console.error(`Failed to push Docker image: ${error.message}`);
            return { success: false, error: `Failed to push Docker image: ${error.message}` };
        }
    }
}

export default DevOpsTool;
