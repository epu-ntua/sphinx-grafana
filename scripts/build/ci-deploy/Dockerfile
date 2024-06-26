FROM cimg/go:1.15.1

RUN git clone https://github.com/aptly-dev/aptly $GOPATH/src/github.com/aptly-dev/aptly
RUN cd $GOPATH/src/github.com/aptly-dev/aptly && \
    # pin aptly to a specific commit after 1.3.0 that contains gpg2 support
    git reset --hard a64807efdaf5e380bfa878c71bc88eae10d62be1 && \
    make install

FROM circleci/python:2.7-stretch-node

USER root

ARG GOOGLE_SDK_VERSION=308.0.0
ARG GOOGLE_SDK_CHECKSUM=9e8e31d9503340fc912374311ac1fffbfc5b59748d20b681f9aca3de2b68deb5

RUN pip install -U awscli crcmod && \
    curl -fLO https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-${GOOGLE_SDK_VERSION}-linux-x86_64.tar.gz && \
    echo "${GOOGLE_SDK_CHECKSUM} google-cloud-sdk-${GOOGLE_SDK_VERSION}-linux-x86_64.tar.gz" | sha256sum --check --status && \
    tar xzf google-cloud-sdk-${GOOGLE_SDK_VERSION}-linux-x86_64.tar.gz -C /opt && \
    rm google-cloud-sdk-${GOOGLE_SDK_VERSION}-linux-x86_64.tar.gz && \
    apt update && \
    apt install -y createrepo expect && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    ln -s /opt/google-cloud-sdk/bin/gsutil /usr/bin/gsutil && \
    ln -s /opt/google-cloud-sdk/bin/gcloud /usr/bin/gcloud && \
    mkdir -p /deb-repo /rpm-repo && \
    chown circleci:circleci /deb-repo /rpm-repo

COPY --from=0 /home/circleci/go/bin/aptly /usr/local/bin/aptly

USER circleci
