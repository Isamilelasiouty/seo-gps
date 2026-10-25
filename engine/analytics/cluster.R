# Content similarity & Cannibalization Clustering Script (R)
# Author: Ismail El Asiouty

suppressPackageStartupMessages({
  if (!require("jsonlite", quietly = TRUE)) install.packages("jsonlite", repos = "https://cloud.r-project.org")
  library(jsonlite)
})

args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) {
  cat('{"clusters": []}\n')
  quit(status = 0)
}

input_file <- args[1]
output_file <- args[2]

data <- fromJSON(input_file)
# Simple Jaccard / Levenshtein overlap calculation
n <- nrow(data)
clusters <- list()

if (n > 1) {
  for (i in 1:(n - 1)) {
    for (j in (i + 1):n) {
      t1 <- unlist(strsplit(tolower(data$title[i]), "\\s+"))
      t2 <- unlist(strsplit(tolower(data$title[j]), "\\s+"))
      intersection <- length(intersect(t1, t2))
      union_val <- length(union(t1, t2))
      sim <- ifelse(union_val > 0, intersection / union_val, 0)

      if (sim >= 0.70) {
        clusters[[length(clusters) + 1]] <- list(
          url_a = data$url[i],
          url_b = data$url[j],
          title_a = data$title[i],
          title_b = data$title[j],
          similarity = round(sim, 3)
        )
      }
    }
  }
}

writeLines(toJSON(list(clusters = clusters), auto_unbox = TRUE), output_file)
