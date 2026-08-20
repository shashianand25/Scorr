// Scorr - Jenkins Declarative Pipeline
pipeline {
    agent {
        docker {
            image 'node:20-alpine'
        }
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Backend Test') {
            steps {
                sh 'cd backend && npm install --no-audit && npm test'
            }
        }
        stage('Web Test') {
            steps {
                sh 'cd web && npm install --no-audit && npm test'
            }
        }
        stage('Mobile Test & TypeCheck') {
            steps {
                sh 'cd mobile && npm install --no-audit --legacy-peer-deps && npm run typecheck && npm test'
            }
        }
    }
}
