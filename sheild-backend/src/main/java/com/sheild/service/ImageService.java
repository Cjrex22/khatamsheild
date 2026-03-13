package com.sheild.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ImageService {
    public byte[] compressToSquareJpeg(MultipartFile file, int size) throws IOException {
        BufferedImage original = ImageIO.read(file.getInputStream());
        if (original == null) {
            throw new IOException("Failed to read image data.");
        }
        
        BufferedImage resized = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = resized.createGraphics();
        
        // Fill with white background in case of transparency
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, size, size);
        
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        // Crop to square before resize
        int minDim = Math.min(original.getWidth(), original.getHeight());
        int x = (original.getWidth() - minDim) / 2;
        int y = (original.getHeight() - minDim) / 2;
        BufferedImage cropped = original.getSubimage(x, y, minDim, minDim);

        g2d.drawImage(cropped, 0, 0, size, size, null);
        g2d.dispose();
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(resized, "jpg", baos);
        return baos.toByteArray();
    }
}
